import { Router } from "express";
import {
  changePassword,
  listUsers,
  updateProfile,
} from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  changePasswordSchema,
  listUsersQuerySchema,
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
router.get("/", restrictTo("admin"), validate(listUsersQuerySchema, "query"), listUsers);

export default router;
