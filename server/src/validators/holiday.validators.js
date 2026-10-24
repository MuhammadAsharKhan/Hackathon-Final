import { z } from "zod";
import { dateStringSchema } from "./common.validators.js";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");

export const createHolidaySchema = z.object({
  date: dateStringSchema,
  name: nameSchema,
});

export const updateHolidaySchema = z
  .object({
    date: dateStringSchema.optional(),
    name: nameSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const holidayQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
