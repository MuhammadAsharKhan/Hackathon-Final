import bcrypt from "bcryptjs";
import User from "../models/User.js";
import PasswordOtp from "../models/PasswordOtp.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  PASSWORD_RESET,
  createOtpCode,
  hashOtpCode,
  otpCodeMatches,
  signResetToken,
  verifyResetToken,
} from "../utils/otp.js";
import { sendEmail } from "../utils/mailer.js";
import { ensurePasswordDiffers, saveNewPassword } from "../utils/password.js";
import {
  REFRESH_COOKIE,
  REFRESH_GRACE_MS,
  clearRefreshCookie,
  createSession,
  hashToken,
  setRefreshCookie,
  verifyRefreshToken,
} from "../utils/tokens.js";
import { employeeSummaryForUser } from "../services/employeeService.js";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-1", 12);
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SEND_GAP_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const SEND_LIMIT = 5;

const buildSessionPayload = async (user, accessToken) => ({
  user,
  employee: await employeeSummaryForUser(user),
  mustChangePassword: user.mustChangePassword,
  accessToken,
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  // Unknown emails still compare against a dummy hash, so both failures take
  // about the same time.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.password || DUMMY_HASH
  );
  if (!user || !user.password || !passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(401, "This account is inactive");
  }

  await User.updateOne({ _id: user.id }, { $set: { lastLoginAt: new Date() } });

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: await buildSessionPayload(user, accessToken),
    message: "Logged in",
  });
});

const readSendQuota = async (email, purpose, now) => {
  const otpRecord = await PasswordOtp.findOne({ email, purpose });
  if (!otpRecord) {
    return { otpRecord: null, withinWindow: false, sendCount: 0 };
  }

  const withinWindow =
    now.getTime() - otpRecord.windowStart.getTime() < SEND_WINDOW_MS;

  return {
    otpRecord,
    withinWindow,
    sendCount: withinWindow ? otpRecord.sendCount : 0,
  };
};

const sendOtpCode = async (user, purpose) => {
  const now = new Date();
  const { otpRecord, withinWindow, sendCount } = await readSendQuota(
    user.email,
    purpose,
    now
  );

  // One code per minute, five per hour. Over the limit, the request stays silent.
  if (
    otpRecord &&
    now.getTime() - otpRecord.lastSentAt.getTime() < SEND_GAP_MS
  ) {
    return;
  }
  if (sendCount >= SEND_LIMIT) return;

  const code = createOtpCode();
  await PasswordOtp.findOneAndUpdate(
    { email: user.email, purpose },
    {
      $set: {
        userId: user.id,
        otpHash: hashOtpCode(code),
        attempts: 0,
        resetJti: "",
        lastSentAt: now,
        sendCount: sendCount + 1,
        windowStart: withinWindow ? otpRecord.windowStart : now,
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
  if (user && user.isActive) await sendOtpCode(user, PASSWORD_RESET);

  res.json({
    success: true,
    data: { requested: true },
    message: "If this email has an account, a code was sent.",
  });
});

// Parallel guesses must not reset each other's count, so the increment happens
// in the database and the record dies at the limit.
const recordFailedOtpAttempt = async (otpRecord) => {
  const updated = await PasswordOtp.findOneAndUpdate(
    { _id: otpRecord._id },
    { $inc: { attempts: 1 } },
    { new: true }
  );

  if (updated && updated.attempts >= OTP_MAX_ATTEMPTS) {
    await PasswordOtp.deleteOne({ _id: otpRecord._id });
  }
};

const issueResetToken = async (otpRecord, userId) => {
  const { token, jti } = signResetToken(userId);
  otpRecord.otpHash = "";
  otpRecord.attempts = 0;
  otpRecord.resetJti = jti;
  await otpRecord.save();
  return token;
};

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  const otpRecord = user
    ? await PasswordOtp.findOne({ email, purpose: PASSWORD_RESET })
    : null;

  if (!otpRecord || !otpRecord.otpHash || otpRecord.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired code");
  }

  if (!otpCodeMatches(otp, otpRecord.otpHash)) {
    await recordFailedOtpAttempt(otpRecord);
    throw new ApiError(400, "Invalid or expired code");
  }

  const resetToken = await issueResetToken(otpRecord, user.id);
  res.json({ success: true, data: { resetToken } });
});

const readResetPayload = (resetToken) => {
  try {
    return verifyResetToken(resetToken);
  } catch {
    throw new ApiError(400, "Invalid or expired reset token");
  }
};

const findActiveResetRecord = async (resetPayload) => {
  const otpRecord = await PasswordOtp.findOne({
    userId: resetPayload.sub,
    purpose: PASSWORD_RESET,
    resetJti: resetPayload.jti,
  });

  if (!otpRecord || otpRecord.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  return otpRecord;
};

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  const resetPayload = readResetPayload(resetToken);
  const otpRecord = await findActiveResetRecord(resetPayload);

  const user = await User.findById(resetPayload.sub).select(
    "+password +refreshTokens +previousRefreshToken"
  );
  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  await ensurePasswordDiffers(user, newPassword);
  await saveNewPassword(user, newPassword);
  await otpRecord.deleteOne();

  res.json({ success: true, data: {}, message: "Password updated" });
});

const findSessionUser = (userId) =>
  User.findById(userId).select("+refreshTokens +previousRefreshToken");

const isRecentRotation = async (userId, tokenHash) => {
  const user = await User.findById(userId).select("+previousRefreshToken");
  const previousToken = user?.previousRefreshToken;

  return Boolean(
    previousToken &&
      previousToken.tokenHash === tokenHash &&
      Date.now() - new Date(previousToken.rotatedAt).getTime() <=
        REFRESH_GRACE_MS
  );
};

const rotateStoredToken = async (userId, tokenHash) => {
  const rotation = await User.updateOne(
    { _id: userId, "refreshTokens.tokenHash": tokenHash },
    {
      $pull: { refreshTokens: { tokenHash } },
      $set: { previousRefreshToken: { tokenHash, rotatedAt: new Date() } },
    }
  );

  if (rotation.modifiedCount > 0) return true;
  return isRecentRotation(userId, tokenHash);
};

const revokeAllSessions = (userId) =>
  User.updateOne(
    { _id: userId },
    { $set: { refreshTokens: [], previousRefreshToken: null } }
  );

export const refreshSession = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, "Refresh token missing");

  let refreshPayload;
  try {
    refreshPayload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await findSessionUser(refreshPayload.sub);
  if (!user || !user.isActive) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // A rotated token stays valid for a short grace window so parallel tabs do
  // not sign each other out.
  const rotated = await rotateStoredToken(user.id, hashToken(token));
  if (!rotated) {
    await revokeAllSessions(user.id);
    clearRefreshCookie(res);
    throw new ApiError(401, "Refresh token reuse detected");
  }

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: await buildSessionPayload(user, accessToken),
  });
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
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(401, "Not authenticated");

  res.json({
    success: true,
    data: {
      user,
      employee: await employeeSummaryForUser(user),
      mustChangePassword: user.mustChangePassword,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select(
    "+password +refreshTokens +previousRefreshToken"
  );
  if (!user) throw new ApiError(404, "User not found");

  const currentMatches = await user.comparePassword(currentPassword);
  if (!currentMatches) {
    throw new ApiError(400, "Current password is incorrect", [
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  }

  // A successful change signs out every other session.
  await ensurePasswordDiffers(user, newPassword);
  user.mustChangePassword = false;
  await saveNewPassword(user, newPassword);

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: await buildSessionPayload(user, accessToken),
    message: "Password updated",
  });
});
