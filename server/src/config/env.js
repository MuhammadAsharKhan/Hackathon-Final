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
  SELF_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KEEP_ALIVE_MINUTES: z.coerce.number().int().positive().default(4),
  ADMIN_EMAIL: emailField,
  ADMIN_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(8).max(72).optional()
  ),
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
  selfUrl: env.SELF_URL ?? "",
  keepAliveMinutes: env.KEEP_ALIVE_MINUTES,
  adminEmail: env.ADMIN_EMAIL ?? "",
  adminPassword: env.ADMIN_PASSWORD ?? "",
});
