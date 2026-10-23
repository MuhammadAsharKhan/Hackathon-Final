import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .transform((value) => value.toLowerCase())
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Invalid email",
  });

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name must be at most 60 characters");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password must be at most 72 bytes",
  })
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const ageSchema = z.coerce
  .number()
  .int("Age must be a whole number")
  .min(1, "Age must be at least 1")
  .max(150, "Age must be at most 150");

export const genderSchema = z.enum(
  ["male", "female", "other", "prefer_not_to_say"],
  "Gender must be male, female, other or prefer_not_to_say"
);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  age: ageSchema,
  gender: genderSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password must be at most 72 characters")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
      message: "Password must be at most 72 bytes",
    }),
});

export const googleSignInSchema = z.object({
  credential: z.string().min(20, "Google credential is required"),
});

export const facebookSignInSchema = z.object({
  accessToken: z.string().min(20, "Facebook access token is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().min(1, "Code is required").max(10, "Invalid code"),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().min(1, "Code is required").max(10, "Invalid code"),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});
