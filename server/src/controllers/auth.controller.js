import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  createSession,
  hashToken,
  setRefreshCookie,
  verifyRefreshToken,
} from "../utils/tokens.js";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-1", 12);

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const user = await User.create({ name, email, password });
  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: { user, accessToken },
    message: "Registered",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    "+password +refreshTokens"
  );
  const matches = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH
  );

  if (!user || !matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { user, accessToken }, message: "Logged in" });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, "Refresh token missing");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub).select("+refreshTokens");
  if (!user) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(token);
  const index = user.refreshTokens.findIndex(
    (entry) => entry.tokenHash === tokenHash
  );

  if (index === -1) {
    user.refreshTokens = [];
    await user.save();
    clearRefreshCookie(res);
    throw new ApiError(401, "Refresh token reuse detected");
  }

  user.refreshTokens.splice(index, 1);

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (token) {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      "refreshTokens.tokenHash": tokenHash,
    }).select("+refreshTokens");

    if (user) {
      user.refreshTokens = user.refreshTokens.filter(
        (entry) => entry.tokenHash !== tokenHash
      );
      await user.save();
    }
  }

  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true }, message: "Logged out" });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
