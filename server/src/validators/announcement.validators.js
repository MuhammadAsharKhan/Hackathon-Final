import { z } from "zod";
import { limitSchema, pageSchema } from "./common.validators.js";

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title is too long"),
  body: z
    .string()
    .trim()
    .min(3, "Body must be at least 3 characters")
    .max(2000, "Body is too long"),
});

export const announcementQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});
