import { Router } from "express";
import {
  changePassword,
  deleteAvatar,
  findUserByUid,
  listUsers,
  updateAvatar,
  updateProfile,
} from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { avatarUpload } from "../middleware/upload.js";
import { uidLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  changePasswordSchema,
  listUsersQuerySchema,
  uidParamSchema,
  updateProfileSchema,
} from "../validators/user.validators.js";

const router = Router();

router.use(protect);

router.patch("/me", validate(updateProfileSchema), updateProfile);
router.patch(
  "/me/password",
  validate(changePasswordSchema),
  changePassword
);
router.put("/me/avatar", avatarUpload, updateAvatar);
router.delete("/me/avatar", deleteAvatar);
router.get(
  "/uid/:uid",
  uidLimiter,
  validate(uidParamSchema, "params"),
  findUserByUid
);
router.get(
  "/",
  restrictTo("admin"),
  validate(listUsersQuerySchema, "query"),
  listUsers
);

export default router;
