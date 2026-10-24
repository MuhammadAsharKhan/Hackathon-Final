import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  refreshSession,
  resetPassword,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "../validators/auth.validators.js";

const router = Router();

router.post("/login", authLimiter, validate(loginSchema), login);
router.post(
  "/forgot-password",
  otpLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), verifyOtp);
router.post(
  "/reset-password",
  otpLimiter,
  validate(resetPasswordSchema),
  resetPassword
);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  changePassword
);

export default router;
