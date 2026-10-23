import User from "../models/User.js";
import PasswordOtp from "../models/PasswordOtp.js";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PASSWORD_RESET, verifyResetToken } from "../utils/otp.js";
import { ensurePasswordDiffers, saveNewPassword } from "../utils/password.js";
import { createSession, setRefreshCookie } from "../utils/tokens.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.age !== undefined) updates.age = req.body.age;
  if (req.body.gender !== undefined) updates.gender = req.body.gender;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) throw new ApiError(404, "User not found");

  res.json({ success: true, data: { user }, message: "Profile updated" });
});

export const findUserByUid = asyncHandler(async (req, res) => {
  const user = await User.findOne({ uid: req.params.uid }).select(
    "uid name avatarUrl createdAt"
  );

  if (!user) throw new ApiError(404, "User not found");

  res.json({
    success: true,
    data: {
      user: {
        uid: user.uid,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    },
  });
});

// One square image per uid. Uploading again replaces the previous file.
const uploadToCloudinary = (file, uid) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "hackathon/avatars",
        public_id: `user_${uid}`,
        overwrite: true,
        resource_type: "image",
        transformation: {
          width: 400,
          height: 400,
          crop: "fill",
          gravity: "face",
        },
      },
      (uploadError, uploadedImage) => {
        if (uploadError || !uploadedImage) {
          return reject(new ApiError(502, "Image upload failed"));
        }
        return resolve(uploadedImage);
      }
    );

    uploadStream.end(file.buffer);
  });

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, "Image upload is not configured");
  }
  if (!req.file) throw new ApiError(400, "Choose an image to upload");

  const uploadedImage = await uploadToCloudinary(req.file, req.user.uid);
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        avatarUrl: uploadedImage.secure_url,
        avatarPublicId: uploadedImage.public_id,
      },
    },
    { new: true }
  );

  if (!user) throw new ApiError(404, "User not found");

  res.json({ success: true, data: { user }, message: "Avatar updated" });
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, "Image upload is not configured");
  }

  const existingUser = await User.findById(req.user.id);
  if (!existingUser) throw new ApiError(404, "User not found");

  if (existingUser.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(existingUser.avatarPublicId, {
        resource_type: "image",
      });
    } catch (deleteError) {
      console.error(`Cloudinary delete failed: ${deleteError.message}`);
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { avatarUrl: "", avatarPublicId: "" } },
    { new: true }
  );

  res.json({ success: true, data: { user }, message: "Avatar removed" });
});

const findOwnedResetRecord = async (resetToken, userId) => {
  let tokenPayload;
  try {
    tokenPayload = verifyResetToken(resetToken);
  } catch {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (tokenPayload.sub !== userId) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const otpRecord = await PasswordOtp.findOne({
    userId,
    purpose: PASSWORD_RESET,
    resetJti: tokenPayload.jti,
  });
  if (!otpRecord || otpRecord.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  return otpRecord;
};

const authorizePasswordChange = async (user, currentPassword, resetToken) => {
  if (resetToken) {
    return findOwnedResetRecord(resetToken, user.id);
  }

  const currentMatches = await user.comparePassword(currentPassword);
  if (!currentMatches) {
    throw new ApiError(400, "Current password is incorrect", [
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  }

  return null;
};

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, resetToken, newPassword } = req.body;
  const user = await User.findById(req.user.id).select(
    "+password +refreshTokens +previousRefreshToken"
  );
  if (!user) throw new ApiError(404, "User not found");

  const resetRecord = await authorizePasswordChange(
    user,
    currentPassword,
    resetToken
  );

  // A reset token proved control of the mailbox, so the account is verified.
  if (resetRecord) user.emailVerified = true;

  // A successful change signs out every other session.
  await ensurePasswordDiffers(user, newPassword);
  await saveNewPassword(user, newPassword);
  if (resetRecord) await resetRecord.deleteOne();

  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { user, accessToken },
    message: "Password updated",
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(offset).limit(limit),
    User.countDocuments(),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});
