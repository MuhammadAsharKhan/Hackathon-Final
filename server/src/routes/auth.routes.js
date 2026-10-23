import { Router } from "express";
import {
  facebookSignIn,
  forgotPassword,
  getMe,
  googleSignIn,
  login,
  logout,
  refreshSession,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  facebookSignInSchema,
  forgotPasswordSchema,
  googleSignInSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyOtpSchema,
} from "../validators/auth.validators.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleSignInSchema), googleSignIn);
router.post(
  "/facebook",
  authLimiter,
  validate(facebookSignInSchema),
  facebookSignIn
);
router.post(
  "/forgot-password",
  otpLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), verifyOtp);
router.post(
  "/verify-email",
  otpLimiter,
  validate(verifyEmailSchema),
  verifyEmail
);
router.post(
  "/resend-verification",
  otpLimiter,
  validate(resendVerificationSchema),
  resendVerification
);
router.post(
  "/reset-password",
  otpLimiter,
  validate(resetPasswordSchema),
  resetPassword
);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
