import mongoose from "mongoose";
import { EMAIL_VERIFICATION, PASSWORD_RESET } from "../utils/otp.js";

const passwordOtpSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: [PASSWORD_RESET, EMAIL_VERIFICATION],
      default: PASSWORD_RESET,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otpHash: {
      type: String,
      default: "",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    sendCount: {
      type: Number,
      default: 0,
    },
    windowStart: {
      type: Date,
      default: Date.now,
    },
    resetJti: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

passwordOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
passwordOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordOtp = mongoose.model("PasswordOtp", passwordOtpSchema);

export default PasswordOtp;
