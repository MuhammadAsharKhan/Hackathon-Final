import { z } from "zod";
import { timeStringSchema, timezoneSchema } from "./common.validators.js";

const weekendDaysSchema = z
  .array(z.coerce.number().int().min(0, "Weekday must be 0 to 6").max(6, "Weekday must be 0 to 6"))
  .max(7, "There are only seven weekdays")
  .refine((days) => new Set(days).size === days.length, {
    message: "Weekend days must be unique",
  });

export const updateSettingsSchema = z
  .object({
    companyName: z.string().trim().min(1, "Company name is required").max(120).optional(),
    timezone: timezoneSchema.optional(),
    officeStart: timeStringSchema.optional(),
    graceMinutes: z.coerce.number().int().min(0).max(120).optional(),
    halfDayHours: z.coerce.number().min(1).max(12).optional(),
    weekendDays: weekendDaysSchema.optional(),
    officeLat: z.coerce.number().min(-90).max(90).nullable().optional(),
    officeLng: z.coerce.number().min(-180).max(180).nullable().optional(),
    radiusMeters: z.coerce.number().int().min(10).max(5000).optional(),
    weeklyHours: z.coerce.number().min(1).max(168).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
