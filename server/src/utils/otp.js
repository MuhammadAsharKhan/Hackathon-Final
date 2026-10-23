import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const PASSWORD_RESET = "password-reset";
export const EMAIL_VERIFICATION = "email-verification";

const RESET_TTL = "10m";

export const createOtpCode = () => String(crypto.randomInt(100000, 1000000));

export const hashOtpCode = (code) =>
  crypto
    .createHmac("sha256", config.jwtResetSecret)
    .update(String(code))
    .digest("hex");

export const otpCodeMatches = (code, storedHash) => {
  const expectedHash = Buffer.from(hashOtpCode(code), "hex");
  const storedHashBytes = Buffer.from(storedHash || "", "hex");

  if (storedHashBytes.length !== expectedHash.length) return false;
  return crypto.timingSafeEqual(expectedHash, storedHashBytes);
};

// The token carries a jti that must match the user's current OTP record, so a
// code can be exchanged for exactly one reset.
export const signResetToken = (userId) => {
  const jti = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign(
    { sub: userId, purpose: PASSWORD_RESET, jti },
    config.jwtResetSecret,
    { expiresIn: RESET_TTL }
  );

  return { token, jti };
};

export const verifyResetToken = (token) => {
  const tokenPayload = jwt.verify(token, config.jwtResetSecret);

  if (tokenPayload.purpose !== PASSWORD_RESET) {
    throw new Error("Reset token has the wrong purpose");
  }

  return tokenPayload;
};
