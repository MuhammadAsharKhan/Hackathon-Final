import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import { config } from "../config/env.js";
import { AI_DEFAULTS, AI_PROVIDER_PRESETS } from "../config/aiDefaults.js";
import { encryptSecret } from "../utils/crypto.js";

export const loadAiSettings = async () => {
  const existingSettings = await AiSettings.findOne();
  if (existingSettings) return existingSettings;

  return AiSettings.create({ ...AI_DEFAULTS });
};

const envPreset = () =>
  AI_PROVIDER_PRESETS[config.aiProvider] ?? AI_PROVIDER_PRESETS.gemini;

// AI_API_KEY is the first key. It is imported only while the database holds no
// key at all, so a key removed from /admin/ai is never brought back.
const seedAiKey = async () => {
  if (!config.aiApiKey) return false;
  const storedKey = await AiKey.exists({});
  if (storedKey) return false;

  const preset = envPreset();
  await AiKey.create({
    provider: preset.provider,
    label: `${config.aiProvider} environment key`,
    encryptedKey: encryptSecret(config.aiApiKey),
  });

  console.log("AI keys: imported the environment key");
  return true;
};

const seedAiSettings = async () => {
  const existingSettings = await AiSettings.exists({});
  if (existingSettings) return;

  const preset = envPreset();
  const providerDefaults =
    preset.provider === "gemini"
      ? { geminiModel: preset.model, geminiBaseUrl: preset.baseUrl }
      : { grokModel: preset.model, grokBaseUrl: preset.baseUrl };

  await AiSettings.create({
    ...AI_DEFAULTS,
    defaultProvider: preset.provider,
    ...providerDefaults,
  });
};

export const setupAi = async () => {
  await seedAiKey();
  await seedAiSettings();
};
