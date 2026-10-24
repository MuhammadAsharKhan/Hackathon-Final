import { z } from "zod";
import { emailSchema, nameSchema, passwordSchema } from "./auth.validators.js";

export const setupSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(120, "Company name is too long"),
  adminName: nameSchema,
  adminEmail: emailSchema,
  adminPassword: passwordSchema,
});
