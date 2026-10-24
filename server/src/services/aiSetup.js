import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import { config } from "../config/env.js";
import {
  AI_DEFAULTS,
  AI_PROVIDER_PRESETS,
  detectGrokVendor,
  grokVendorPreset,
} from "../config/aiDefaults.js";
import { encryptSecret } from "../utils/crypto.js";

export const loadAiSettings = async () => {
  const existingSettings = await AiSettings.findOne();
  if (existingSettings) return existingSettings;

  return AiSettings.create({ ...AI_DEFAULTS });
};

const envPreset = () =>
  AI_PROVIDER_PRESETS[config.aiProvider] ?? AI_PROVIDER_PRESETS.gemini;

// Every key the environment carries, in seeding order: the numbered Gemini
// keys, the numbered grok keys, then AI_API_KEY with AI_PROVIDER as its vendor.
export const envKeys = () => {
  const keys = config.aiKeyEnv.map(({ name, value }) => {
    if (name.startsWith("GEMINI")) {
      return { name, value, provider: "gemini", vendor: "gemini" };
    }

    return {
      name,
      value,
      provider: "grok",
      vendor: detectGrokVendor(value) ?? (config.aiProvider === "xai" ? "xai" : "groq"),
    };
  });

  if (config.aiApiKey) {
    const preset = envPreset();
    keys.push({
      name: "AI_API_KEY",
      value: config.aiApiKey,
      provider: preset.provider,
      vendor: preset.provider === "gemini" ? "gemini" : config.aiProvider,
    });
  }

  return keys;
};

// The keys are imported only while the database holds none at all, so a key
// removed from /admin/ai is never brought back by a restart.
const seedAiKeys = async (keys) => {
  if (keys.length === 0) return;
  const storedKey = await AiKey.exists({});
  if (storedKey) return;

  for (const key of keys) {
    const vendor = key.provider === "grok" ? ` (${key.vendor})` : "";
    await AiKey.create({
      provider: key.provider,
      label: `${key.name}${vendor}`.slice(0, 60),
      encryptedKey: encryptSecret(key.value),
    });
  }

  console.log(`AI keys: imported ${keys.length} key(s) from the environment`);
};

// The grok pair in settings is one base URL for every grok key, so the keys of
// a single vendor decide it. A mixed or empty set keeps the configured preset.
const seedAiSettings = async (keys) => {
  const existingSettings = await AiSettings.exists({});
  if (existingSettings) return;

  const grokPreset =
    grokVendorPreset(
      keys.filter((key) => key.provider === "grok").map((key) => key.vendor)
    ) ??
    (envPreset().provider === "grok" ? envPreset() : AI_PROVIDER_PRESETS.groq);

  const hasGemini = keys.some((key) => key.provider === "gemini");
  const hasGrok = keys.some((key) => key.provider === "grok");
  const defaultProvider = hasGemini ? "gemini" : hasGrok ? "grok" : envPreset().provider;

  await AiSettings.create({
    ...AI_DEFAULTS,
    defaultProvider,
    grokModel: grokPreset.model,
    grokBaseUrl: grokPreset.baseUrl,
  });
};

export const setupAi = async () => {
  const keys = envKeys();
  await seedAiKeys(keys);
  await seedAiSettings(keys);
};
