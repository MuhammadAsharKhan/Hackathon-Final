import { config } from "./env.js";

export const AI_DEFAULTS = {
  defaultProvider: "gemini",
  geminiModel: "gemini-3.5-flash-lite",
  geminiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
  grokModel: "openai/gpt-oss-20b",
  grokBaseUrl: "https://api.groq.com/openai/v1",
  systemPrompt:
    "You are a helpful assistant. Keep answers short and direct. Use markdown for code blocks and lists.",
};

// AI_PROVIDER names the vendor. Gemini has its own adapter; Groq and xAI both
// speak the OpenAI-compatible shape, which the pool stores as "grok".
export const AI_PROVIDER_PRESETS = {
  gemini: {
    provider: "gemini",
    baseUrl: AI_DEFAULTS.geminiBaseUrl,
    model: AI_DEFAULTS.geminiModel,
  },
  groq: {
    provider: "grok",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-20b",
  },
  xai: {
    provider: "grok",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4.7",
  },
};

const isLoopbackHost = (hostname) =>
  ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);

const isPrivateHost = (hostname) => {
  if (isLoopbackHost(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  return hostname.endsWith(".local") || hostname.endsWith(".internal");
};

// Production only reaches the public internet over https. Development may use
// a local mock server, and credentials are never part of a base URL.
export const isAllowedAiBaseUrl = (value) => {
  if (!value) return false;

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    return false;
  }

  if (parsedUrl.username || parsedUrl.password) return false;

  if (parsedUrl.protocol === "https:") {
    return !config.isProduction || !isPrivateHost(parsedUrl.hostname);
  }

  if (config.isProduction) return false;
  return parsedUrl.protocol === "http:" && isLoopbackHost(parsedUrl.hostname);
};
