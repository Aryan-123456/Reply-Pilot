import assert from "node:assert/strict";
import test from "node:test";

process.env.GOOGLE_CLIENT_ID = "client-id";
const { getGoogleAuthUrl } = await import("../lib/google");

test("Google OAuth URL has an encoded state and least-required business scope", () => {
  const url = new URL(getGoogleAuthUrl("csrf-state", "https://app.example.com/api/google/callback"));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("state"), "csrf-state");
  assert.equal(url.searchParams.get("redirect_uri"), "https://app.example.com/api/google/callback");
  assert.match(url.searchParams.get("scope") ?? "", /business\.manage/);
  assert.equal(url.searchParams.get("access_type"), "offline");
});
