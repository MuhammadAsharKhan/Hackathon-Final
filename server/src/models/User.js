import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createUid } from "../utils/uid.js";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const previousTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    rotatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      unique: true,
      immutable: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name must be at most 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    hasPassword: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number,
      default: null,
      min: [1, "Age must be at least 1"],
      max: [150, "Age must be at most 150"],
      validate: {
        validator: Number.isInteger,
        message: "Age must be a whole number",
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: null,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
      default: "",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
    previousRefreshToken: {
      type: previousTokenSchema,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("validate", async function assignUid() {
  if (!this.isNew || this.uid) return;
  this.uid = await createUid(this.constructor);
});

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;

  if (!this.password) {
    this.hasPassword = false;
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
  this.hasPassword = true;
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.age === undefined) ret.age = null;
    if (ret.gender === undefined) ret.gender = null;
    delete ret._id;
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.previousRefreshToken;
    delete ret.googleId;
    delete ret.avatarPublicId;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
