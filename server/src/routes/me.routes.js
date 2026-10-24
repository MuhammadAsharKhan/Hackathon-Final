import { Router } from "express";
import { updateMyProfile } from "../controllers/user.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema } from "../validators/user.validators.js";

const router = Router();

router.patch(
  "/profile",
  protect,
  restrictTo("hr", "employee"),
  validate(updateProfileSchema),
  updateMyProfile
);

export default router;
