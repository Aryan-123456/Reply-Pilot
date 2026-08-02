import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";

export function getGoogleAuthUrl(state: string, redirectUri?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured");
  const uri = redirectUri || process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: uri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/business.manage",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: state,
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

export async function exchangeGoogleCode(code: string, redirectUri?: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not configured");
  const uri = redirectUri || process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: uri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Gets a valid decrypted Google access token, automatically refreshing it if expired.
 */
export async function getValidGoogleAccessToken(googleAccountId: string): Promise<string> {
  const account = await prisma.googleAccount.findUnique({
    where: { id: googleAccountId },
  });

  if (!account) {
    throw new Error(`Google account ${googleAccountId} not found.`);
  }

  const now = new Date();
  // Buffer of 5 minutes before expiration
  const bufferMs = 5 * 60 * 1000;
  const expiresAt = new Date(account.accessTokenExpiresAt).getTime();

  if (expiresAt - bufferMs > now.getTime()) {
    // Current token is still valid
    return decryptToken(account.encryptedAccessToken);
  }

  // Token is expired or expiring soon, refresh it
  const refreshToken = decryptToken(account.encryptedRefreshToken);
  if (!refreshToken) {
    throw new Error("No refresh token available to renew access token");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not configured");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google token (${res.status}): ${errText}`);
  }

  const tokenData: GoogleTokenResponse = await res.json();
  const newAccessToken = tokenData.access_token;
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Update DB with re-encrypted access token
  await prisma.googleAccount.update({
    where: { id: googleAccountId },
    data: {
      encryptedAccessToken: encryptToken(newAccessToken),
      accessTokenExpiresAt: newExpiresAt,
      // Update refresh token if Google returned a new one
      ...(tokenData.refresh_token ? { encryptedRefreshToken: encryptToken(tokenData.refresh_token) } : {}),
    },
  });

  return newAccessToken;
}

export interface GoogleAccountProfile {
  id: string;
  email: string;
  name?: string;
}

export interface GoogleBusinessAccount {
  name: string;
  accountName: string;
}

export interface GoogleBusinessLocation {
  name: string;
  title: string;
  address?: string;
}

export async function fetchGoogleBusinessAccounts(accessToken: string): Promise<GoogleBusinessAccount[]> {
  const response = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Google Business account discovery failed (${response.status})`);
  const data = await response.json();
  return (data.accounts ?? []).filter((account: unknown): account is GoogleBusinessAccount => {
    return typeof (account as GoogleBusinessAccount)?.name === "string" && typeof (account as GoogleBusinessAccount)?.accountName === "string";
  });
}

export async function fetchGoogleBusinessLocations(accessToken: string, accountName: string): Promise<GoogleBusinessLocation[]> {
  const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`);
  url.searchParams.set("readMask", "name,title,storefrontAddress");
  url.searchParams.set("pageSize", "100");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Google Business location discovery failed (${response.status})`);
  const data = await response.json();
  return (data.locations ?? []).filter((location: unknown): location is GoogleBusinessLocation => {
    return typeof (location as GoogleBusinessLocation)?.name === "string" && typeof (location as GoogleBusinessLocation)?.title === "string";
  }).map((location: GoogleBusinessLocation & { storefrontAddress?: { addressLines?: string[] } }) => ({
    name: location.name,
    title: location.title,
    address: location.storefrontAddress?.addressLines?.join(", "),
  }));
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleAccountProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Google user profile: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id || "google-user-" + Date.now(),
    email: data.email || "user@example.com",
    name: data.name || "Google User",
  };
}

export interface ExternalGoogleReview {
  reviewId: string;
  reviewerName: string;
  starRating: number;
  comment?: string;
  createTime: string;
  updateTime?: string;
  reviewReply?: {
    comment: string;
    updateTime?: string;
  };
}

/**
 * Fetches reviews for a given Google Business Profile location.
 */
export async function fetchReviewsFromGoogle(
  accessToken: string,
  googleLocationId: string
): Promise<ExternalGoogleReview[]> {
  const path = googleLocationId;
  if (!path.startsWith("accounts/")) {
    throw new Error("Google location is not selected or has an invalid resource name");
  }

    const url = `https://mybusiness.googleapis.com/v4/${path}/reviews`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error(`Google review sync failed (${res.status})`);
    const data = await res.json();
    const reviews = data.reviews || [];
    return reviews.map((r: any) => ({
        reviewId: r.reviewId || r.name || `rev-${Math.random().toString(36).substring(2, 9)}`,
        reviewerName: r.reviewer?.displayName || "Anonymous Customer",
        starRating: convertStarRating(r.starRating),
        comment: r.comment || "",
        createTime: r.createTime || new Date().toISOString(),
        updateTime: r.updateTime,
        reviewReply: r.reviewReply ? { comment: r.reviewReply.comment, updateTime: r.reviewReply.updateTime } : undefined,
    }));
}

/**
 * Sends a reply to a Google review via Google My Business API.
 */
export async function postReplyToGoogleApi(
  accessToken: string,
  googleLocationId: string,
  googleReviewId: string,
  replyText: string
): Promise<boolean> {
  const locationPath = googleLocationId;
  if (!locationPath.startsWith("accounts/")) throw new Error("Google location is not selected or has an invalid resource name");

    const reviewPath = googleReviewId.includes("/")
      ? googleReviewId
      : `${locationPath}/reviews/${googleReviewId}`;

    const url = `https://mybusiness.googleapis.com/v4/${reviewPath}/reply`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyText }),
    });

    if (!res.ok) throw new Error(`Google reply post failed (${res.status})`);
    return true;
}

function convertStarRating(ratingStr: string | number): number {
  if (typeof ratingStr === "number") return ratingStr;
  switch (ratingStr) {
    case "FIVE": return 5;
    case "FOUR": return 4;
    case "THREE": return 3;
    case "TWO": return 2;
    case "ONE": return 1;
    default: return 5;
  }
}
