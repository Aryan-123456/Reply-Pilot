import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireOrganization } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET(request: Request) {
  try {
    const { organization } = await requireOrganization();
    const state = crypto.randomBytes(32).toString("base64url");
    const statePayload = JSON.stringify({
      orgId: organization.id,
      timestamp: Date.now(),
    });
    const authUrl = getGoogleAuthUrl(state);
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("google_oauth_state", `${state}.${Buffer.from(statePayload).toString("base64url")}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/google/callback",
    });

    return response;
  } catch (error) {
    console.error("Error initiating Google OAuth connect:", error);
    return NextResponse.redirect(new URL("/settings?error=oauth_init_failed", request.url));
  }
}
