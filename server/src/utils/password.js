import ApiError from "./ApiError.js";

const PASSWORD_REUSE_MESSAGE =
  "New password must be different from the current password";

export const ensurePasswordDiffers = async (user, newPassword) => {
  if (!user.password) return;

  const samePassword = await user.comparePassword(newPassword);
  if (!samePassword) return;

  throw new ApiError(400, PASSWORD_REUSE_MESSAGE, [
    { field: "newPassword", message: PASSWORD_REUSE_MESSAGE },
  ]);
};

export const saveNewPassword = async (user, newPassword) => {
  user.password = newPassword;
  user.refreshTokens = [];
  user.previousRefreshToken = null;
  await user.save();
};
