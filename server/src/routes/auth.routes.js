import { Router } from "express";
import {
  forgotPassword,
  getMe,
  googleSignIn,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  googleSignInSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "../validators/auth.validators.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleSignInSchema), googleSignIn);
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
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
