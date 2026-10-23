import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decryptValue, encryptValue, maskKey } from "../utils/crypto.js";
import { loadAiSettings } from "../services/aiSetup.js";
import { testAiKey } from "../services/aiKeyPool.js";

const presentKey = (key, plainKey) => ({
  id: key.id,
  provider: key.provider,
  label: key.label,
  maskedKey: maskKey(plainKey || ""),
  enabled: key.enabled,
  status: key.status,
  cooldownUntil: key.cooldownUntil,
  lastUsedAt: key.lastUsedAt,
  usageCount: key.usageCount,
  lastError: key.lastError,
});

export const listAiKeys = asyncHandler(async (req, res) => {
  const keys = await AiKey.find()
    .sort({ createdAt: 1 })
    .select("+encryptedKey");

  res.json({
    success: true,
    data: {
      keys: keys.map((key) =>
        presentKey(key, decryptValue(key.encryptedKey))
      ),
    },
  });
});

export const createAiKey = asyncHandler(async (req, res) => {
  const { provider, label, apiKey } = req.body;
  const key = await AiKey.create({
    provider,
    label,
    encryptedKey: encryptValue(apiKey),
  });

  res.status(201).json({
    success: true,
    data: { key: presentKey(key, apiKey) },
    message: "Key added",
  });
});

export const updateAiKey = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.label !== undefined) updates.label = req.body.label;
  if (req.body.enabled !== undefined) updates.enabled = req.body.enabled;

  if (req.body.apiKey) {
    updates.encryptedKey = encryptValue(req.body.apiKey);
    updates.status = "active";
    updates.cooldownUntil = null;
    updates.lastError = "";
  }

  const key = await AiKey.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true }
  ).select("+encryptedKey");

  if (!key) throw new ApiError(404, "Key not found");

  res.json({
    success: true,
    data: {
      key: presentKey(
        key,
        req.body.apiKey || decryptValue(key.encryptedKey)
      ),
    },
    message: "Key updated",
  });
});

export const deleteAiKey = asyncHandler(async (req, res) => {
  const key = await AiKey.findByIdAndDelete(req.params.id);
  if (!key) throw new ApiError(404, "Key not found");

  res.json({
    success: true,
    data: { id: req.params.id },
    message: "Key deleted",
  });
});

export const testAiKeyById = asyncHandler(async (req, res) => {
  const key = await AiKey.findById(req.params.id).select("+encryptedKey");
  if (!key) throw new ApiError(404, "Key not found");

  const result = await testAiKey(key);

  res.json({
    success: true,
    data: result,
    message: result.ok ? "Key works" : "Key failed the test",
  });
});

export const getAiSettings = asyncHandler(async (req, res) => {
  const settings = await loadAiSettings();
  res.json({ success: true, data: { settings } });
});

export const updateAiSettings = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.geminiBaseUrl) {
    updates.geminiBaseUrl = updates.geminiBaseUrl.replace(/\/+$/, "");
  }
  if (updates.grokBaseUrl) {
    updates.grokBaseUrl = updates.grokBaseUrl.replace(/\/+$/, "");
  }

  await loadAiSettings();

  const settings = await AiSettings.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: { settings },
    message: "Settings updated",
  });
});
