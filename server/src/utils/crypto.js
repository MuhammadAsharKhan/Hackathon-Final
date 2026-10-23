import crypto from "crypto";
import { config } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const encryptionKey = Buffer.from(config.aiKeySecret, "hex");

// Stored as iv.authTag.ciphertext, each part base64 encoded.
export const encryptSecret = (plainSecret) => {
  const initializationVector = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    encryptionKey,
    initializationVector
  );
  const encrypted = Buffer.concat([
    cipher.update(plainSecret, "utf8"),
    cipher.final(),
  ]);

  return [
    initializationVector.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

export const decryptSecret = (storedCiphertext) => {
  const [ivPart, authTagPart, encryptedPart] =
    String(storedCiphertext).split(".");
  if (!ivPart || !authTagPart || !encryptedPart) return "";

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey,
      Buffer.from(ivPart, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTagPart, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return "";
  }
};

export const maskKey = (apiKey) => `****${String(apiKey).slice(-4)}`;
