import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");

const descriptionSchema = z.string().trim().max(300, "Description is too long");

export const createDepartmentSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const departmentQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});
