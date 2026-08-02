import assert from "node:assert/strict";
import test from "node:test";

process.env.TOKEN_ENCRYPTION_KEY = "test-only-key-do-not-use-in-production";
const { decryptToken, encryptToken } = await import("../lib/crypto");

test("AES-GCM encryption round-trips without preserving plaintext", () => {
  const token = "google-refresh-token";
  const encrypted = encryptToken(token);
  assert.notEqual(encrypted, token);
  assert.equal(encrypted.split(":").length, 3);
  assert.equal(decryptToken(encrypted), token);
});

test("AES-GCM uses a unique random IV for each encryption", () => {
  const first = encryptToken("same-token");
  const second = encryptToken("same-token");
  assert.notEqual(first, second);
});

test("malformed encrypted data is rejected", () => {
  assert.throws(() => decryptToken("not-an-encrypted-token"));
});
