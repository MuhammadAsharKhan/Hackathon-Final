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

const GROK_VENDORS = {
  "gsk_": {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-20b",
  },
  "xai-": {
    name: "xai",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4.7",
  },
};

export const detectGrokVendor = (apiKey) => {
  if (!apiKey) return null;

  const prefix = Object.keys(GROK_VENDORS).find((candidate) =>
    apiKey.startsWith(candidate)
  );

  return prefix ? GROK_VENDORS[prefix] : null;
};

export const isAllowedAiBaseUrl = (value) => {
  if (!value) return false;
  if (value.startsWith("https://")) return true;

  return !config.isProduction && /^http:\/\/localhost(:\d+)?(\/|$)/.test(value);
};
