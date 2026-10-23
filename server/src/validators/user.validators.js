import { z } from "zod";
import {
  ageSchema,
  genderSchema,
  nameSchema,
  passwordSchema,
} from "./auth.validators.js";

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    age: ageSchema.optional(),
    gender: genderSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .optional(),
    resetToken: z.string().min(1, "Reset token is required").optional(),
    newPassword: passwordSchema,
  })
  .refine(
    (value) => Boolean(value.currentPassword) !== Boolean(value.resetToken),
    { message: "Send either the current password or a reset token" }
  );

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uidParamSchema = z.object({
  uid: z.string().regex(/^\d{9}$/, "Invalid uid"),
});
