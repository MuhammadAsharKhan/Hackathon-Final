import { z } from "zod";

const emptyToUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const statusSchema = z.enum(["todo", "in_progress", "done"]);

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(120, "Title must be at most 120 characters");

const descriptionSchema = z
  .string()
  .refine((value) => value === "" || value.trim().length > 0, {
    message: "Description cannot contain only spaces",
  })
  .transform((value) => value.trim())
  .refine((value) => value.length <= 2000, {
    message: "Description must be at most 2000 characters",
  });

export const createItemSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: statusSchema.optional(),
});

export const updateItemSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional()
  ),
  status: z.preprocess(emptyToUndefined, statusSchema.optional()),
});

export const itemIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id"),
});

export const itemUidParamSchema = z.object({
  uid: z.string().regex(/^\d{9}$/, "Invalid uid"),
});
