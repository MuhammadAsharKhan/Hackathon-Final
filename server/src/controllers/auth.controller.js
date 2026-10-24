import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import PasswordOtp from "../models/PasswordOtp.js";
import { config } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  EMAIL_VERIFICATION,
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

const DUMMY_HASH = bcrypt.hashSync("dummy-password-1", 12);
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SEND_GAP_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const SEND_LIMIT = 5;
const googleClient = new OAuth2Client(config.googleClientId);

const sendVerificationCode = (user) => sendOtpCode(user, EMAIL_VERIFICATION);

const startRegisteredSession = async (res, user) => {
  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  return { user, accessToken };
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, age, gender } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser?.emailVerified) {
    throw new ApiError(409, "Email already registered");
  }
  if (existingUser && !config.emailVerificationRequired) {
    throw new ApiError(409, "Email already registered");
  }

  if (!config.emailVerificationRequired) {
    const user = await User.create({
      name,
      email,
      password,
      age,
      gender: gender ?? null,
      emailVerified: true,
    });
    const session = await startRegisteredSession(res, user);

    res.status(201).json({ success: true, data: session, message: "Registered" });
    return;
  }

  // An abandoned sign-up is updated and resent instead of locking the email,
  // but its password stays: this caller has not proven it owns the account.
  let user = existingUser;
  if (user) {
    user.name = name;
    user.age = age;
    user.gender = gender ?? null;
    await user.save();
  } else {
    user = await User.create({
      name,
      email,
      password,
      age,
      gender: gender ?? null,
      emailVerified: false,
    });
  }

  await sendVerificationCode(user);

  res.status(201).json({
    success: true,
    data: { email, verificationRequired: true },
    message: "Verification code sent",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select(
    "+password +refreshTokens"
  );

  // Unknown emails still compare against a dummy hash, so both failures take
  // about the same time.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.password || DUMMY_HASH
  );
  if (!user || !user.password || !passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.emailVerified) {
    await sendVerificationCode(user);
    throw new ApiError(
      403,
      "Verify your email to continue",
      undefined,
      "EMAIL_NOT_VERIFIED"
    );
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
  } catch (error) {
    // The client only ever sees a generic 401. The reason stays in the server
    // log, where "audience mismatch" tells an operator that GOOGLE_CLIENT_ID
    // differs from the client ID the browser used.
    console.warn(`Google credential rejected: ${error.message}`);
    throw new ApiError(401, "Google sign-in failed");
  }
};

const googleDisplayName = (googleProfile, email) => {
  const name = (googleProfile.name || email.split("@")[0] || "User")
    .trim()
    .slice(0, 60);
  return name.length >= 2 ? name : "User";
};

const findOrCreateGoogleUser = async (googleProfile) => {
  const email = googleProfile.email.toLowerCase();
  const userFields = "+password +refreshTokens +previousRefreshToken";
  let user = await User.findOne({ googleId: googleProfile.sub }).select(
    userFields
  );
  if (!user) user = await User.findOne({ email }).select(userFields);

  if (!user) {
    return User.create({
      name: googleDisplayName(googleProfile, email),
      email,
      googleId: googleProfile.sub,
      avatarUrl: googleProfile.picture || "",
      hasPassword: false,
      emailVerified: true,
    });
  }

  if (!user.googleId) user.googleId = googleProfile.sub;
  if (!user.avatarUrl && googleProfile.picture) {
    user.avatarUrl = googleProfile.picture;
  }

  // Google proves the mailbox. A password set while the account was
  // unverified never belonged to the owner of this address.
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.password = undefined;
    user.hasPassword = false;
    user.refreshTokens = [];
    user.previousRefreshToken = null;
  }

  await user.save();
  return user;
};

export const googleSignIn = asyncHandler(async (req, res) => {
  if (!config.googleClientId) {
    throw new ApiError(503, "Google sign-in is not configured");
  }

  const googleTicket = await verifyGoogleCredential(req.body.credential);
  const googleProfile = googleTicket.getPayload();

  if (!googleProfile?.email || googleProfile.email_verified !== true) {
    throw new ApiError(401, "Google account email is not verified");
  }

  const user = await findOrCreateGoogleUser(googleProfile);
  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { user, accessToken },
    message: "Logged in",
  });
});

const GRAPH_API_BASE = "https://graph.facebook.com";

const readGraphAnswer = async (url, options) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);

  if (!response.ok || !body || body.error) {
    throw new ApiError(401, "Facebook sign-in failed");
  }

  return body;
};

const verifyFacebookToken = async (facebookToken) => {
  const appToken = `${config.facebookAppId}|${config.facebookAppSecret}`;
  const url =
    `${GRAPH_API_BASE}/debug_token?input_token=` +
    `${encodeURIComponent(facebookToken)}&access_token=` +
    encodeURIComponent(appToken);
  const answer = await readGraphAnswer(url);

  // The token must be valid and issued to this app, not just any Facebook app.
  if (answer.data?.is_valid !== true) {
    throw new ApiError(401, "Facebook sign-in failed");
  }
  if (String(answer.data.app_id) !== config.facebookAppId) {
    throw new ApiError(401, "Facebook sign-in failed");
  }
};

const readFacebookProfile = async (facebookToken) => {
  const profileUrl = `${GRAPH_API_BASE}/me?fields=id,name,email`;
  const answer = await readGraphAnswer(profileUrl, {
    headers: { Authorization: `Bearer ${facebookToken}` },
  });

  if (!answer.id) throw new ApiError(401, "Facebook sign-in failed");
  return answer;
};

const facebookDisplayName = (facebookProfile, email) => {
  const name = (facebookProfile.name || email.split("@")[0] || "User")
    .trim()
    .slice(0, 60);
  return name.length >= 2 ? name : "User";
};

const findOrCreateFacebookUser = async (facebookProfile) => {
  const user = await User.findOne({ facebookId: facebookProfile.id });
  if (user) return user;

  const email = (facebookProfile.email || "").trim().toLowerCase();
  if (!email) {
    throw new ApiError(400, "Facebook did not share an email address.");
  }

  // Facebook does not link to an existing account, so a shared email is a
  // clear conflict rather than a silent takeover.
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists. Sign in with your password or Google."
    );
  }

  return User.create({
    name: facebookDisplayName(facebookProfile, email),
    email,
    facebookId: facebookProfile.id,
    hasPassword: false,
    emailVerified: true,
    age: null,
    gender: null,
  });
};

export const facebookSignIn = asyncHandler(async (req, res) => {
  if (!config.facebookAppId || !config.facebookAppSecret) {
    throw new ApiError(503, "Facebook sign-in is not configured");
  }

  const facebookToken = req.body.accessToken;
  await verifyFacebookToken(facebookToken);
  const facebookProfile = await readFacebookProfile(facebookToken);
  const user = await findOrCreateFacebookUser(facebookProfile);

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { user, accessToken },
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
    subject: purpose === EMAIL_VERIFICATION ? "Verify your email" : "Password reset code",
    text: `Your code is ${code}. This code expires in 10 minutes.`,
    html: `<p>Your code is ${code}.</p><p>This code expires in 10 minutes.</p>`,
  });
};

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) await sendOtpCode(user, PASSWORD_RESET);

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

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  const otpRecord = user
    ? await PasswordOtp.findOne({ email, purpose: EMAIL_VERIFICATION })
    : null;

  if (!otpRecord || !otpRecord.otpHash || otpRecord.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired code");
  }

  if (!otpCodeMatches(otp, otpRecord.otpHash)) {
    await recordFailedOtpAttempt(otpRecord);
    throw new ApiError(400, "Invalid or expired code");
  }

  user.emailVerified = true;
  await user.save();
  await otpRecord.deleteOne();

  const session = await startRegisteredSession(res, user);
  res.json({ success: true, data: session, message: "Email verified" });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && !user.emailVerified) await sendVerificationCode(user);

  res.json({
    success: true,
    data: { requested: true },
    message: "If this email needs verification, a code was sent.",
  });
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

  // The code proved control of the mailbox, so the account is verified too.
  user.emailVerified = true;
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
  if (!user) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (!user.emailVerified) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Verify your email to continue");
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
