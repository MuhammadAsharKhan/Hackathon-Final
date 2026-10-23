import mongoose from "mongoose";

const passwordOtpSchema = new mongoose.Schema(
  {
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
      unique: true,
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

passwordOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordOtp = mongoose.model("PasswordOtp", passwordOtpSchema);

export default PasswordOtp;
