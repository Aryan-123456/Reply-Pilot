import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for AES-GCM

function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be configured before OAuth tokens can be used");
  }
  // Always derive a 32-byte key using sha256 to handle arbitrary secret string lengths cleanly
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a string token using AES-256-GCM.
 * Output format: iv_hex:auth_tag_hex:encrypted_hex
 */
export function encryptToken(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a token encrypted with encryptToken.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return "";
  
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted token format");

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Never return ciphertext or a legacy plaintext token as though it were valid.
    throw new Error("Unable to decrypt Google token; reconnect the Google account");
  }
}
