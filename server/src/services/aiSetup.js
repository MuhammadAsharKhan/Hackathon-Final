import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import { config } from "../config/env.js";
import { AI_DEFAULTS, detectGrokVendor } from "../config/aiDefaults.js";
import { encryptValue } from "../utils/crypto.js";

export const loadAiSettings = async () => {
  const existing = await AiSettings.findOne();
  if (existing) return existing;

  return AiSettings.create({ ...AI_DEFAULTS });
};

const seedKeys = async () => {
  const existing = await AiKey.countDocuments();
  if (existing > 0) return;

  const keys = [
    ...config.geminiApiKeys.map((apiKey, index) => ({
      provider: "gemini",
      label: `Gemini ${index + 1}`,
      encryptedKey: encryptValue(apiKey),
    })),
    ...config.grokApiKeys.map((apiKey, index) => ({
      provider: "grok",
      label: `Grok ${index + 1}`,
      encryptedKey: encryptValue(apiKey),
    })),
  ];

  if (keys.length > 0) await AiKey.insertMany(keys);
};

const seedSettings = async () => {
  const existing = await AiSettings.findOne();
  if (existing) return;

  const vendor = detectGrokVendor(config.grokApiKeys[0]);
  const useGrok =
    config.geminiApiKeys.length === 0 && config.grokApiKeys.length > 0;

  await AiSettings.create({
    ...AI_DEFAULTS,
    defaultProvider: useGrok ? "grok" : AI_DEFAULTS.defaultProvider,
    grokBaseUrl: vendor?.baseUrl ?? AI_DEFAULTS.grokBaseUrl,
    grokModel: vendor?.model ?? AI_DEFAULTS.grokModel,
  });
};

export const setupAi = async () => {
  await seedKeys();
  await seedSettings();
};
