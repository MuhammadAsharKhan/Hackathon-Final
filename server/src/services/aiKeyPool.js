import AiKey from "../models/AiKey.js";
import { config } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { decryptValue } from "../utils/crypto.js";
import { loadAiSettings } from "./aiSetup.js";
import {
  ProviderError,
  askGemini,
  askGrok,
} from "./aiProviders.js";

const MAX_ATTEMPTS = 6;
const EMPTY_REPLY = "I cannot help with that request.";
const REQUEST_FAILED = "The model could not answer that.";
const ALL_FAILED = "AI Buddy is busy. Try again in a minute.";

const providerOrder = (defaultProvider) =>
  defaultProvider === "gemini" ? ["gemini", "grok"] : ["grok", "gemini"];

const claimKey = (provider, triedIds) =>
  AiKey.findOneAndUpdate(
    {
      provider,
      enabled: true,
      status: "active",
      _id: { $nin: triedIds },
      $or: [{ cooldownUntil: null }, { cooldownUntil: { $lte: new Date() } }],
    },
    { $set: { lastUsedAt: new Date() }, $inc: { usageCount: 1 } },
    { new: true, sort: { lastUsedAt: 1 } }
  ).select("+encryptedKey");

const claimNextKey = async (providers, triedIds) => {
  for (const provider of providers) {
    const key = await claimKey(provider, triedIds);
    if (key) return key;
  }

  return null;
};

const handleFailure = async (key, error) => {
  if (error.kind === "request") throw new ApiError(422, REQUEST_FAILED);

  const updates = { lastError: String(error.summary).slice(0, 160) };

  if (error.kind === "auth") {
    updates.status = "invalid";
    updates.cooldownUntil = null;
  } else {
    const seconds = error.retryAfterSeconds || config.aiCooldownSeconds;
    updates.cooldownUntil = new Date(Date.now() + seconds * 1000);
  }

  await AiKey.updateOne({ _id: key.id }, { $set: updates });
};

const callKey = (key, settings, messages) => {
  const apiKey = decryptValue(key.encryptedKey);
  if (!apiKey) throw new ProviderError("auth", "Stored key could not be read");

  const isGemini = key.provider === "gemini";
  const model = isGemini ? settings.geminiModel : settings.grokModel;
  const baseUrl = isGemini ? settings.geminiBaseUrl : settings.grokBaseUrl;
  const ask = isGemini ? askGemini : askGrok;

  return ask({
    apiKey,
    model,
    baseUrl,
    systemPrompt: settings.systemPrompt,
    messages,
  });
};

const answerWithKey = async (key, settings, messages) => {
  const reply = await callKey(key, settings, messages);
  const model = key.provider === "gemini" ? settings.geminiModel : settings.grokModel;

  return { reply: reply || EMPTY_REPLY, provider: key.provider, model };
};

export const chatWithPool = async ({ settings, messages }) => {
  const triedIds = [];
  const providers = providerOrder(settings.defaultProvider);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const key = await claimNextKey(providers, triedIds);
    if (!key) break;

    triedIds.push(key.id);

    try {
      return await answerWithKey(key, settings, messages);
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      await handleFailure(key, error);
    }
  }

  throw new ApiError(503, ALL_FAILED);
};

export const testAiKey = async (key) => {
  const settings = await loadAiSettings();

  try {
    const reply = await callKey(key, settings, [
      { role: "user", content: "Reply with the word ok" },
    ]);
    await AiKey.updateOne(
      { _id: key.id },
      { $set: { status: "active", lastError: "", cooldownUntil: null } }
    );

    return { ok: true, reply: reply || EMPTY_REPLY };
  } catch (error) {
    if (!(error instanceof ProviderError)) throw error;
    if (error.kind === "request") return { ok: false, error: REQUEST_FAILED };

    await handleFailure(key, error);
    return { ok: false, error: String(error.summary) };
  }
};
