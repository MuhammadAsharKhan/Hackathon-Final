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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  SELF_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KEEP_ALIVE_MINUTES: z.coerce.number().int().positive().default(4),
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
  EMAIL_VERIFICATION_REQUIRED: z.enum(["true", "false"]).default("true"),
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  FACEBOOK_APP_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  FACEBOOK_APP_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_CLOUD_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MAIL_FROM: z.string().default("onboarding@resend.dev"),
  AI_KEY_SECRET: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "AI_KEY_SECRET must be 64 hex characters"),
  AI_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  GEMINI_API_KEY_1: z.preprocess(emptyToUndefined, z.string().optional()),
  GEMINI_API_KEY_2: z.preprocess(emptyToUndefined, z.string().optional()),
  GROK_API_KEY_1: z.preprocess(emptyToUndefined, z.string().optional()),
  GROK_API_KEY_2: z.preprocess(emptyToUndefined, z.string().optional()),
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
  adminEmail: env.ADMIN_EMAIL ?? "",
  adminPassword: env.ADMIN_PASSWORD ?? "",
  jwtResetSecret: env.JWT_RESET_SECRET,
  emailVerificationRequired: env.EMAIL_VERIFICATION_REQUIRED !== "false",
  googleClientId: env.GOOGLE_CLIENT_ID ?? "",
  facebookAppId: env.FACEBOOK_APP_ID ?? "",
  facebookAppSecret: env.FACEBOOK_APP_SECRET ?? "",
  cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: env.CLOUDINARY_API_SECRET ?? "",
  resendApiKey: env.RESEND_API_KEY ?? "",
  mailFrom: env.MAIL_FROM,
  aiKeySecret: env.AI_KEY_SECRET,
  aiCooldownSeconds: env.AI_COOLDOWN_SECONDS,
  geminiApiKeys: [env.GEMINI_API_KEY_1, env.GEMINI_API_KEY_2].filter(Boolean),
  grokApiKeys: [env.GROK_API_KEY_1, env.GROK_API_KEY_2].filter(Boolean),
});
