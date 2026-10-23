import User from "../models/User.js";
import PasswordOtp from "../models/PasswordOtp.js";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyResetToken } from "../utils/otp.js";
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
  const found = await User.findOne({ uid: req.params.uid }).select(
    "uid name avatarUrl createdAt"
  );

  if (!found) throw new ApiError(404, "User not found");

  res.json({
    success: true,
    data: {
      user: {
        uid: found.uid,
        name: found.name,
        avatarUrl: found.avatarUrl,
        createdAt: found.createdAt,
      },
    },
  });
});

const uploadToCloudinary = (file, uid) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "hackathon/avatars",
        public_id: `user_${uid}`,
        overwrite: true,
        resource_type: "image",
        transformation: { width: 400, height: 400, crop: "fill", gravity: "face" },
      },
      (error, result) => {
        if (error || !result) {
          return reject(new ApiError(502, "Image upload failed"));
        }
        return resolve(result);
      }
    );

    stream.end(file.buffer);
  });

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, "Image upload is not configured");
  }
  if (!req.file) throw new ApiError(400, "Choose an image to upload");

  const uploaded = await uploadToCloudinary(req.file, req.user.uid);
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        avatarUrl: uploaded.secure_url,
        avatarPublicId: uploaded.public_id,
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

  const current = await User.findById(req.user.id);
  if (!current) throw new ApiError(404, "User not found");

  if (current.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(current.avatarPublicId, {
        resource_type: "image",
      });
    } catch (error) {
      console.error(`Cloudinary delete failed: ${error.message}`);
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
  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (payload.sub !== userId) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const record = await PasswordOtp.findOne({
    userId,
    resetJti: payload.jti,
  });
  if (!record || record.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  return record;
};

const rejectSamePassword = async (user, newPassword) => {
  if (!user.password) return;

  const samePassword = await user.comparePassword(newPassword);
  if (!samePassword) return;

  throw new ApiError(400, "New password must be different from the current password", [
    {
      field: "newPassword",
      message: "New password must be different from the current password",
    },
  ]);
};

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, resetToken, newPassword } = req.body;
  const user = await User.findById(req.user.id).select(
    "+password +refreshTokens +previousRefreshToken"
  );
  if (!user) throw new ApiError(404, "User not found");

  let resetRecord = null;
  if (resetToken) {
    resetRecord = await findOwnedResetRecord(resetToken, user.id);
  } else {
    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      throw new ApiError(400, "Current password is incorrect", [
        { field: "currentPassword", message: "Current password is incorrect" },
      ]);
    }
  }

  await rejectSamePassword(user, newPassword);

  user.password = newPassword;
  user.hasPassword = true;
  user.refreshTokens = [];
  user.previousRefreshToken = null;
  await user.save();
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
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
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
