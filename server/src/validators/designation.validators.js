import { z } from "zod";
import { objectIdSchema } from "./common.validators.js";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");

export const createDesignationSchema = z.object({
  name: nameSchema,
  departmentId: objectIdSchema.nullable().optional(),
});

export const updateDesignationSchema = z
  .object({
    name: nameSchema.optional(),
    departmentId: objectIdSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
