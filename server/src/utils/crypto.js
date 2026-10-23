import crypto from "crypto";
import { config } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const key = Buffer.from(config.aiKeySecret, "hex");

export const encryptValue = (plainValue) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainValue, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

export const decryptValue = (storedValue) => {
  const [ivPart, tagPart, encryptedPart] = String(storedValue).split(".");
  if (!ivPart || !tagPart || !encryptedPart) return "";

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivPart, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
};

export const maskKey = (apiKey) => `****${String(apiKey).slice(-4)}`;
