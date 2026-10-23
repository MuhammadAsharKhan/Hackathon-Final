import { config } from "../config/env.js";

export const startKeepAlive = () => {
  if (!config.isProduction) return () => {};

  const baseUrl =
    config.selfUrl ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "");

  if (!baseUrl) return () => {};

  const url = `${baseUrl.replace(/\/+$/, "")}/api/health`;
  const intervalMs = config.keepAliveMinutes * 60 * 1000;

  const timer = setInterval(async () => {
    try {
      await fetch(url, { signal: AbortSignal.timeout(10000) });
    } catch (error) {
      console.error(`Keep alive ping failed: ${error.message}`);
    }
  }, intervalMs);

  timer.unref();
  console.log(`Keep alive started for ${url}`);

  return () => clearInterval(timer);
};
