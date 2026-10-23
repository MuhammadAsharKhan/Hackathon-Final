import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import PasswordOtp from "../models/PasswordOtp.js";
import { config } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createOtpCode,
  hashOtp,
  otpMatches,
  signResetToken,
  verifyResetToken,
} from "../utils/otp.js";
import { sendEmail } from "../utils/mailer.js";
import {
  REFRESH_COOKIE,
  REFRESH_GRACE_MS,
  clearRefreshCookie,
  createSession,
  hashToken,
  setRefreshCookie,
  verifyRefreshToken,
} from "../utils/tokens.js";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-1", 12);
const OTP_TTL_MS = 10 * 60 * 1000;
const SEND_GAP_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const SEND_LIMIT = 5;
const googleClient = new OAuth2Client(config.googleClientId);

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, age, gender } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const user = await User.create({
    name,
    email,
    password,
    age,
    gender: gender ?? null,
  });
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
  const matches = await bcrypt.compare(password, user?.password || DUMMY_HASH);

  if (!user || !user.password || !matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { user, accessToken }, message: "Logged in" });
});

const verifyGoogleCredential = async (credential) => {
  try {
    return await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
  } catch {
    throw new ApiError(401, "Google sign-in failed");
  }
};

const googleDisplayName = (profile, email) => {
  const candidate = (profile.name || email.split("@")[0] || "User")
    .trim()
    .slice(0, 60);
  return candidate.length >= 2 ? candidate : "User";
};

const findOrCreateGoogleUser = async (profile) => {
  const email = profile.email.toLowerCase();
  let user = await User.findOne({ googleId: profile.sub });
  if (!user) user = await User.findOne({ email });

  if (!user) {
    return User.create({
      name: googleDisplayName(profile, email),
      email,
      googleId: profile.sub,
      avatarUrl: profile.picture || "",
      hasPassword: false,
    });
  }

  if (!user.googleId) {
    user.googleId = profile.sub;
    if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
    await user.save();
  }

  return user;
};

export const googleSignIn = asyncHandler(async (req, res) => {
  if (!config.googleClientId) {
    throw new ApiError(503, "Google sign-in is not configured");
  }

  const ticket = await verifyGoogleCredential(req.body.credential);
  const profile = ticket.getPayload();

  if (!profile?.email || profile.email_verified !== true) {
    throw new ApiError(401, "Google account email is not verified");
  }

  const user = await findOrCreateGoogleUser(profile);
  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { user, accessToken },
    message: "Logged in",
  });
});

const sendResetCode = async (user) => {
  const now = new Date();
  const existing = await PasswordOtp.findOne({ userId: user.id });
  const withinWindow =
    existing && now.getTime() - existing.windowStart.getTime() < SEND_WINDOW_MS;
  const sendCount = withinWindow ? existing.sendCount : 0;

  if (existing && now.getTime() - existing.lastSentAt.getTime() < SEND_GAP_MS) {
    return;
  }
  if (sendCount >= SEND_LIMIT) return;

  const code = createOtpCode();
  await PasswordOtp.findOneAndUpdate(
    { userId: user.id },
    {
      $set: {
        email: user.email,
        otpHash: hashOtp(code),
        attempts: 0,
        resetJti: "",
        lastSentAt: now,
        sendCount: sendCount + 1,
        windowStart: withinWindow ? existing.windowStart : now,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    },
    { upsert: true, new: true }
  );

  await sendEmail({
    to: user.email,
    subject: "Password reset code",
    text: `Your code is ${code}. This code expires in 10 minutes.`,
    html: `<p>Your code is ${code}.</p><p>This code expires in 10 minutes.</p>`,
  });
};

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) await sendResetCode(user);

  res.json({
    success: true,
    data: { requested: true },
    message: "If this email has an account, a code was sent.",
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  const record = user
    ? await PasswordOtp.findOne({ userId: user.id })
    : null;

  if (!record || !record.otpHash || record.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired code");
  }

  if (!otpMatches(otp, record.otpHash)) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      await record.deleteOne();
    } else {
      await record.save();
    }
    throw new ApiError(400, "Invalid or expired code");
  }

  const { token, jti } = signResetToken(user.id);
  record.otpHash = "";
  record.attempts = 0;
  record.resetJti = jti;
  await record.save();

  res.json({ success: true, data: { resetToken: token } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const record = await PasswordOtp.findOne({
    userId: payload.sub,
    resetJti: payload.jti,
  });
  if (!record || record.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const user = await User.findById(payload.sub).select(
    "+password +refreshTokens +previousRefreshToken"
  );
  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  user.password = newPassword;
  user.hasPassword = true;
  user.refreshTokens = [];
  user.previousRefreshToken = null;
  await user.save();
  await record.deleteOne();

  res.json({ success: true, data: {}, message: "Password updated" });
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

  const user = await User.findById(payload.sub).select(
    "+refreshTokens +previousRefreshToken"
  );
  if (!user) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(token);
  const rotated = await User.updateOne(
    { _id: user.id, "refreshTokens.tokenHash": tokenHash },
    {
      $pull: { refreshTokens: { tokenHash } },
      $set: { previousRefreshToken: { tokenHash, rotatedAt: new Date() } },
    }
  );

  if (rotated.modifiedCount === 0) {
    const previous = await User.findById(user.id).select(
      "+previousRefreshToken"
    );
    const recent = previous?.previousRefreshToken;
    const withinGrace =
      recent &&
      recent.tokenHash === tokenHash &&
      Date.now() - new Date(recent.rotatedAt).getTime() <= REFRESH_GRACE_MS;

    if (!withinGrace) {
      await User.updateOne(
        { _id: user.id },
        { $set: { refreshTokens: [], previousRefreshToken: null } }
      );
      clearRefreshCookie(res);
      throw new ApiError(401, "Refresh token reuse detected");
    }
  }

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (token) {
    const tokenHash = hashToken(token);
    await User.updateOne(
      { "refreshTokens.tokenHash": tokenHash },
      {
        $pull: { refreshTokens: { tokenHash } },
        $set: { previousRefreshToken: null },
      }
    );
  }

  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true }, message: "Logged out" });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
