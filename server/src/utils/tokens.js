import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import User from "../models/User.js";

export const REFRESH_COOKIE = "rt";
export const REFRESH_GRACE_MS = 10 * 1000;

const MAX_SESSIONS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtl,
  });

export const signRefreshToken = (userId) => {
  const jti = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign({ sub: userId, jti }, config.jwtRefreshSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d`,
  });
  return { token, jti };
};

export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwtRefreshSecret);

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction || config.cookieSameSite === "none",
  sameSite: config.cookieSameSite,
  path: "/api/auth",
  maxAge: config.refreshTokenTtlDays * DAY_MS,
});

export const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());

export const clearRefreshCookie = (res) => {
  const options = refreshCookieOptions();
  delete options.maxAge;
  res.clearCookie(REFRESH_COOKIE, options);
};

export const createSession = async (user) => {
  const accessToken = signAccessToken(user);
  const { token: refreshToken } = signRefreshToken(user.id);
  const now = new Date();

  await User.updateOne(
    { _id: user.id },
    { $pull: { refreshTokens: { expiresAt: { $lte: now } } } }
  );

  await User.updateOne(
    { _id: user.id },
    {
      $push: {
        refreshTokens: {
          $each: [
            {
              tokenHash: hashToken(refreshToken),
              expiresAt: new Date(
                now.getTime() + config.refreshTokenTtlDays * DAY_MS
              ),
              createdAt: now,
            },
          ],
          $slice: -MAX_SESSIONS,
        },
      },
    }
  );

  return { accessToken, refreshToken };
};
