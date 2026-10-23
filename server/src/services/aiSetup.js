import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import { config } from "../config/env.js";
import { AI_DEFAULTS, detectGrokVendor } from "../config/aiDefaults.js";
import { decryptSecret, encryptSecret } from "../utils/crypto.js";

export const loadAiSettings = async () => {
  const existingSettings = await AiSettings.findOne();
  if (existingSettings) return existingSettings;

  return AiSettings.create({ ...AI_DEFAULTS });
};

const envProviderKeys = () => [
  ...config.geminiApiKeys.map((apiKey, index) => ({
    provider: "gemini",
    label: `Gemini ${index + 1}`,
    apiKey,
  })),
  ...config.grokApiKeys.map((apiKey, index) => ({
    provider: "grok",
    label: `Grok ${index + 1}`,
    apiKey,
  })),
];

// Environment keys are the defaults, so every boot adds the ones the database
// does not hold yet. A key added to the deployment after the first boot still
// reaches the pool, and a stored key that the current AI_KEY_SECRET cannot
// decrypt does not count as present, so it is replaced instead of lived with.
const seedAiKeys = async () => {
  const wantedKeys = envProviderKeys();
  if (wantedKeys.length === 0) return;

  const storedKeys = await AiKey.find().select("+encryptedKey");
  const storedSecrets = new Set(
    storedKeys.map((keyRecord) => decryptSecret(keyRecord.encryptedKey))
  );

  const seen = new Set();
  const additions = wantedKeys.filter(({ apiKey }) => {
    if (storedSecrets.has(apiKey) || seen.has(apiKey)) return false;
    seen.add(apiKey);
    return true;
  });

  if (additions.length === 0) {
    console.log(`AI keys: ${storedKeys.length} stored, none imported`);
    return;
  }

  await AiKey.insertMany(
    additions.map(({ provider, label, apiKey }) => ({
      provider,
      label,
      encryptedKey: encryptSecret(apiKey),
    }))
  );

  console.log(`AI keys: imported ${additions.length} from environment`);
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
