import { z } from "zod";
import { isValidDateString } from "../utils/dates.js";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const dateStringSchema = z
  .string()
  .trim()
  .refine(isValidDateString, { message: "Date must be a valid YYYY-MM-DD" });

export const monthStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM");

export const timeStringSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");

export const genderSchema = z.enum(
  ["male", "female", "other"],
  "Gender must be male, female or other"
);

const isValidTimeZone = (value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required")
  .refine(isValidTimeZone, { message: "Timezone must be a valid IANA zone" });

export const pageSchema = z.coerce.number().int().min(1).default(1);
export const limitSchema = z.coerce.number().int().min(1).max(100).default(10);
