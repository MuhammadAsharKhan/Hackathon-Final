import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const emailField = z.preprocess(
  emptyToUndefined,
  z.string().trim().toLowerCase().refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Invalid email",
  }).optional()
);

// A blank number is read as 0 by Zod, which either fails the minimum or, for
// TRUST_PROXY_HOPS, silently overrides the default. Blank means unset.
const numberField = (schema, fallback) =>
  z.preprocess(emptyToUndefined, schema.default(fallback));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: numberField(z.coerce.number().int().positive(), 5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
  REFRESH_TOKEN_TTL_DAYS: numberField(
    z.coerce.number().int().positive(),
    7
  ),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY_HOPS: numberField(z.coerce.number().int().min(0), 1),
  SELF_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KEEP_ALIVE_MINUTES: numberField(z.coerce.number().int().positive(), 4),
  COMPANY_NAME: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).default("My Company")
  ),
  ADMIN_EMAIL: emailField,
  ADMIN_PASSWORD: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .min(8)
      .max(72)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
        message: "ADMIN_PASSWORD must be at most 72 bytes",
      })
      .optional()
  ),
  JWT_RESET_SECRET: z
    .string()
    .min(32, "JWT_RESET_SECRET must be at least 32 characters"),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MAIL_FROM: z.string().default("onboarding@resend.dev"),
  AI_KEY_SECRET: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "AI_KEY_SECRET must be 64 hex characters"),
  AI_COOLDOWN_SECONDS: numberField(z.coerce.number().int().positive(), 60),
  AI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  AI_PROVIDER: z.enum(["gemini", "groq", "xai"]).default("gemini"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${details}`);
  console.error("Copy server/.env.example to server/.env and fill in the values.");
  process.exit(1);
}

const env = parsed.data;

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  mongodbUri: env.MONGODB_URI,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  accessTokenTtl: env.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  allowedOrigins: env.CLIENT_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSameSite: env.COOKIE_SAMESITE,
  trustProxyHops: env.TRUST_PROXY_HOPS,
  selfUrl: env.SELF_URL ?? "",
  keepAliveMinutes: env.KEEP_ALIVE_MINUTES,
  companyName: env.COMPANY_NAME,
  adminEmail: env.ADMIN_EMAIL ?? "",
  adminPassword: env.ADMIN_PASSWORD ?? "",
  jwtResetSecret: env.JWT_RESET_SECRET,
  resendApiKey: env.RESEND_API_KEY ?? "",
  mailFrom: env.MAIL_FROM,
  aiKeySecret: env.AI_KEY_SECRET,
  aiCooldownSeconds: env.AI_COOLDOWN_SECONDS,
  aiApiKey: env.AI_API_KEY ?? "",
  aiProvider: env.AI_PROVIDER,
});
