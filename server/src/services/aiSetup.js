import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import { config } from "../config/env.js";
import { AI_DEFAULTS, detectGrokVendor } from "../config/aiDefaults.js";
import { encryptSecret } from "../utils/crypto.js";

export const loadAiSettings = async () => {
  const existingSettings = await AiSettings.findOne();
  if (existingSettings) return existingSettings;

  return AiSettings.create({ ...AI_DEFAULTS });
};

// Environment keys are imported once. After that, the admin page owns them.
const seedAiKeys = async () => {
  const existingKeyCount = await AiKey.countDocuments();
  if (existingKeyCount > 0) return;

  const providerKeys = [
    ...config.geminiApiKeys.map((apiKey, index) => ({
      provider: "gemini",
      label: `Gemini ${index + 1}`,
      encryptedKey: encryptSecret(apiKey),
    })),
    ...config.grokApiKeys.map((apiKey, index) => ({
      provider: "grok",
      label: `Grok ${index + 1}`,
      encryptedKey: encryptSecret(apiKey),
    })),
  ];

  if (providerKeys.length > 0) await AiKey.insertMany(providerKeys);
};

const seedAiSettings = async () => {
  const existingSettings = await AiSettings.findOne();
  if (existingSettings) return;

  const grokVendor = detectGrokVendor(config.grokApiKeys[0]);
  const grokIsOnlyProvider =
    config.geminiApiKeys.length === 0 && config.grokApiKeys.length > 0;

  await AiSettings.create({
    ...AI_DEFAULTS,
    defaultProvider: grokIsOnlyProvider
      ? "grok"
      : AI_DEFAULTS.defaultProvider,
    grokBaseUrl: grokVendor?.baseUrl ?? AI_DEFAULTS.grokBaseUrl,
    grokModel: grokVendor?.model ?? AI_DEFAULTS.grokModel,
  });
};

export const setupAi = async () => {
  await seedAiKeys();
  await seedAiSettings();
};
