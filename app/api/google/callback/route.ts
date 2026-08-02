import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode, fetchGoogleBusinessAccounts, fetchGoogleUserProfile } from "@/lib/google";
import { encryptToken } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { verifyOrgAccess } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const stateCookie = request.headers.get("cookie")?.match(/(?:^|; )google_oauth_state=([^;]*)/)?.[1];

  if (!code || !stateParam || !stateCookie) {
    return NextResponse.redirect(new URL("/settings?error=invalid_callback_params", url.origin));
  }

  try {
    const [cookieState, encodedPayload] = decodeURIComponent(stateCookie).split(".", 2);
    if (!cookieState || !encodedPayload || cookieState !== stateParam) {
      throw new Error("OAuth state validation failed");
    }
    const stateJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const { orgId } = JSON.parse(stateJson);

    if (!orgId) {
      throw new Error("Missing organization ID in OAuth state");
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in again before connecting Google");
    await verifyOrgAccess(orgId, user.id);

    // Exchange authorization code for tokens
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserProfile(tokens.access_token);
    const businessAccounts = await fetchGoogleBusinessAccounts(tokens.access_token);
    const businessAccount = businessAccounts[0];
    if (!businessAccount) throw new Error("No accessible Google Business Profile account was found");

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const existingAccount = await prisma.googleAccount.findUnique({ where: { googleAccountId: businessAccount.name } });
    if (existingAccount && existingAccount.organizationId !== orgId) {
      throw new Error("This Google account is already connected to another workspace");
    }
    if (!tokens.refresh_token && !existingAccount) {
      throw new Error("Google did not return a refresh token. Reconnect and grant offline access.");
    }
    const googleAccount = existingAccount
      ? await prisma.googleAccount.update({ where: { id: existingAccount.id }, data: {
        email: profile.email,
        encryptedAccessToken: encryptToken(tokens.access_token),
        ...(tokens.refresh_token ? { encryptedRefreshToken: encryptToken(tokens.refresh_token) } : {}),
        accessTokenExpiresAt: expiresAt,
      } })
      : await prisma.googleAccount.create({ data: {
        organizationId: orgId,
        googleAccountId: businessAccount.name,
        email: profile.email,
        encryptedAccessToken: encryptToken(tokens.access_token),
        encryptedRefreshToken: encryptToken(tokens.refresh_token!),
        accessTokenExpiresAt: expiresAt,
      } });

    const response = NextResponse.redirect(new URL("/settings?success=google_connected_select_location", url.origin));
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (error) {
    console.error("Error handling Google OAuth callback");
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", url.origin));
  }
}
