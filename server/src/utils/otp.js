import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

const RESET_PURPOSE = "password-reset";
const RESET_TTL = "10m";

export const createOtpCode = () => String(crypto.randomInt(100000, 1000000));

export const hashOtp = (code) =>
  crypto
    .createHmac("sha256", config.jwtResetSecret)
    .update(String(code))
    .digest("hex");

export const otpMatches = (code, storedHash) => {
  const expected = Buffer.from(hashOtp(code), "hex");
  const stored = Buffer.from(storedHash || "", "hex");

  if (stored.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, stored);
};

export const signResetToken = (userId) => {
  const jti = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign(
    { sub: userId, purpose: RESET_PURPOSE, jti },
    config.jwtResetSecret,
    { expiresIn: RESET_TTL }
  );

  return { token, jti };
};

export const verifyResetToken = (token) => {
  const payload = jwt.verify(token, config.jwtResetSecret);

  if (payload.purpose !== RESET_PURPOSE) {
    throw new Error("Reset token has the wrong purpose");
  }

  return payload;
};
