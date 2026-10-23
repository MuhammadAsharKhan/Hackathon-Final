import { z } from "zod";
import { isAllowedAiBaseUrl } from "../config/aiDefaults.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const conversationUidSchema = z
  .string()
  .regex(/^\d{9}$/, "Invalid conversation uid");

const baseUrlSchema = z
  .string()
  .trim()
  .refine(isAllowedAiBaseUrl, "Base URL must use https");

const apiKeySchema = z
  .string()
  .trim()
  .min(20, "API key looks too short")
  .max(300, "API key is too long");

export const chatSchema = z.object({
  conversationUid: conversationUidSchema.optional(),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(4000, "Message must be at most 4000 characters"),
});

export const conversationParamsSchema = z.object({
  uid: conversationUidSchema,
});

export const aiKeyIdSchema = z.object({
  id: objectIdSchema,
});

export const createAiKeySchema = z.object({
  provider: z.enum(["gemini", "grok"]),
  label: z.string().trim().max(60, "Label is too long").default(""),
  apiKey: apiKeySchema,
});

export const updateAiKeySchema = z
  .object({
    label: z.string().trim().max(60, "Label is too long").optional(),
    apiKey: apiKeySchema.optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const aiSettingsSchema = z
  .object({
    defaultProvider: z.enum(["gemini", "grok"]).optional(),
    geminiModel: z.string().trim().min(1).max(120).optional(),
    geminiBaseUrl: baseUrlSchema.optional(),
    grokModel: z.string().trim().min(1).max(120).optional(),
    grokBaseUrl: baseUrlSchema.optional(),
    systemPrompt: z
      .string()
      .trim()
      .min(1, "System prompt is required")
      .max(2000, "System prompt is too long")
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
