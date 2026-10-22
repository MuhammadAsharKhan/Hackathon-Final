import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createSession, setRefreshCookie } from "../utils/tokens.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name: req.body.name },
    { new: true, runValidators: true }
  );

  if (!user) throw new ApiError(404, "User not found");

  res.json({ success: true, data: { user }, message: "Profile updated" });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select(
    "+password +refreshTokens"
  );
  if (!user) throw new ApiError(404, "User not found");

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw new ApiError(400, "Current password is incorrect");

  user.password = newPassword;
  user.refreshTokens = [];
  await user.save();

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
