import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Code must be a lowercase slug");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");

const quotaSchema = z
  .union([
    z.coerce.number().int("Quota must be a whole number").min(0, "Quota cannot be negative"),
    z.null(),
  ])
  .optional();

export const createLeaveTypeSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  yearlyQuota: quotaSchema,
  isPaid: z.boolean().optional(),
});

export const updateLeaveTypeSchema = z
  .object({
    code: codeSchema.optional(),
    name: nameSchema.optional(),
    yearlyQuota: quotaSchema,
    isPaid: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
