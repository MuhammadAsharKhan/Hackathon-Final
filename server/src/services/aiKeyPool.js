import AiKey from "../models/AiKey.js";
import { config } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { decryptSecret } from "../utils/crypto.js";
import { loadAiSettings } from "./aiSetup.js";
import { ProviderError, askGemini, askGrok } from "./aiProviders.js";

const MAX_ATTEMPTS = 6;
// Reverse proxies drop longer requests, so rotation stops at this deadline.
const DEADLINE_MS = 28 * 1000;
const ATTEMPT_TIMEOUT_MS = 12 * 1000;
const EMPTY_REPLY = "I cannot help with that request.";
const REQUEST_FAILED = "The model could not answer that.";
const ALL_FAILED = "AI Buddy is busy. Try again in a minute.";

const orderProviders = (defaultProvider) =>
  defaultProvider === "gemini" ? ["gemini", "grok"] : ["grok", "gemini"];

// Keys are claimed oldest-used first. Claiming counts as a use even if the
// provider then rejects it.
const claimAvailableKey = (provider, triedKeyIds) =>
  AiKey.findOneAndUpdate(
    {
      provider,
      enabled: true,
      status: "active",
      _id: { $nin: triedKeyIds },
      $or: [
        { cooldownUntil: null },
        { cooldownUntil: { $lte: new Date() } },
      ],
    },
    { $set: { lastUsedAt: new Date() }, $inc: { usageCount: 1 } },
    { new: true, sort: { lastUsedAt: 1 } }
  ).select("+encryptedKey");

const claimNextAvailableKey = async (providers, triedKeyIds) => {
  for (const provider of providers) {
    const key = await claimAvailableKey(provider, triedKeyIds);
    if (key) return key;
  }

  return null;
};

const markKeyFailure = async (key, providerError) => {
  const updates = {
    lastError: String(providerError.summary).slice(0, 160),
  };

  // A request the provider rejects does not improve with another key, so it
  // stops the rotation after recording the reason.
  if (providerError.kind === "request") {
    await AiKey.updateOne({ _id: key.id }, { $set: updates });
    throw new ApiError(422, REQUEST_FAILED);
  }

  if (providerError.kind === "auth") {
    updates.status = "invalid";
    updates.cooldownUntil = null;
  } else {
    const cooldownSeconds =
      providerError.retryAfterSeconds || config.aiCooldownSeconds;
    updates.cooldownUntil = new Date(
      Date.now() + cooldownSeconds * 1000
    );
  }

  await AiKey.updateOne({ _id: key.id }, { $set: updates });
};

const requestProviderReply = (key, settings, messages, timeoutMs) => {
  const apiKey = decryptSecret(key.encryptedKey);
  if (!apiKey) {
    throw new ProviderError("auth", "Stored key could not be read");
  }

  const isGemini = key.provider === "gemini";
  const model = isGemini ? settings.geminiModel : settings.grokModel;
  const baseUrl = isGemini ? settings.geminiBaseUrl : settings.grokBaseUrl;
  const askProvider = isGemini ? askGemini : askGrok;

  return askProvider({
    apiKey,
    model,
    baseUrl,
    systemPrompt: settings.systemPrompt,
    messages,
    timeoutMs,
  });
};

const answerWithProviderKey = async (key, settings, messages, timeoutMs) => {
  const reply = await requestProviderReply(key, settings, messages, timeoutMs);
  const model =
    key.provider === "gemini" ? settings.geminiModel : settings.grokModel;

  return { reply: reply || EMPTY_REPLY, provider: key.provider, model };
};

const tryAvailableKeys = async (
  providers,
  settings,
  messages,
  triedKeyIds,
  deadline
) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return null;

    const key = await claimNextAvailableKey(providers, triedKeyIds);
    if (!key) return null;

    triedKeyIds.push(key.id);

    try {
      return await answerWithProviderKey(
        key,
        settings,
        messages,
        Math.min(ATTEMPT_TIMEOUT_MS, remainingMs)
      );
    } catch (providerError) {
      if (!(providerError instanceof ProviderError)) throw providerError;
      await markKeyFailure(key, providerError);
    }
  }

  return null;
};

export const chatWithPool = async ({ settings, messages }) => {
  const triedKeyIds = [];
  const providers = orderProviders(settings.defaultProvider);

  const answer = await tryAvailableKeys(
    providers,
    settings,
    messages,
    triedKeyIds,
    Date.now() + DEADLINE_MS
  );
  if (answer) return answer;

  throw new ApiError(503, ALL_FAILED);
};

export const testAiKey = async (key) => {
  const settings = await loadAiSettings();

  try {
    const reply = await requestProviderReply(key, settings, [
      { role: "user", content: "Reply with the word ok" },
    ]);
    await AiKey.updateOne(
      { _id: key.id },
      { $set: { status: "active", lastError: "", cooldownUntil: null } }
    );

    return { ok: true, reply: reply || EMPTY_REPLY };
  } catch (providerError) {
    if (!(providerError instanceof ProviderError)) throw providerError;
    if (providerError.kind === "request") {
      return { ok: false, error: REQUEST_FAILED };
    }

    await markKeyFailure(key, providerError);
    return { ok: false, error: String(providerError.summary) };
  }
};
