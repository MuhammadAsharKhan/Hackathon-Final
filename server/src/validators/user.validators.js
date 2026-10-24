import { z } from "zod";
import { emailSchema, nameSchema } from "./auth.validators.js";
import {
  dateStringSchema,
  genderSchema,
  limitSchema,
  objectIdSchema,
  pageSchema,
} from "./common.validators.js";

export const createHrUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  departmentId: objectIdSchema,
  designationId: objectIdSchema.nullable().optional(),
  joinDate: dateStringSchema,
  basicSalary: z.coerce
    .number()
    .positive("Basic salary must be greater than 0"),
  gender: genderSchema.optional(),
  phone: z.string().trim().max(30, "Phone is too long").optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(["admin", "hr", "employee"]).optional(),
  search: z.string().trim().max(80).optional(),
  page: pageSchema,
  limit: limitSchema,
});

export const setUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export const updateProfileSchema = z
  .object({
    phone: z.string().trim().max(30, "Phone is too long").optional(),
    address: z.string().trim().max(300, "Address is too long").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
