import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import User from "../models/User.js";

export const REFRESH_COOKIE = "rt";
export const REFRESH_GRACE_MS = 10 * 1000;

// Only the five newest refresh tokens are kept. Older logins are dropped.
const MAX_SESSIONS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenTtl,
  });

const signRefreshToken = (userId) => {
  const tokenId = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign(
    { sub: userId, jti: tokenId },
    config.jwtRefreshSecret,
    { expiresIn: `${config.refreshTokenTtlDays}d` }
  );
  return { token, tokenId };
};

export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwtRefreshSecret);

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction || config.cookieSameSite === "none",
  sameSite: config.cookieSameSite,
  path: "/api/auth",
  maxAge: config.refreshTokenTtlDays * DAY_MS,
});

export const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, buildRefreshCookieOptions());

export const clearRefreshCookie = (res) => {
  const options = buildRefreshCookieOptions();
  delete options.maxAge;
  res.clearCookie(REFRESH_COOKIE, options);
};

const removeExpiredSessions = (userId, now) =>
  User.updateOne(
    { _id: userId },
    { $pull: { refreshTokens: { expiresAt: { $lte: now } } } }
  );

const storeRefreshToken = (userId, refreshToken, now) =>
  User.updateOne(
    { _id: userId },
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

export const createSession = async (user) => {
  const accessToken = signAccessToken(user);
  const { token: refreshToken } = signRefreshToken(user.id);
  const now = new Date();

  await removeExpiredSessions(user.id, now);
  await storeRefreshToken(user.id, refreshToken, now);

  return { accessToken, refreshToken };
};
