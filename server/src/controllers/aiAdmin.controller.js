import AiKey from "../models/AiKey.js";
import AiSettings from "../models/AiSettings.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  decryptSecret,
  encryptSecret,
  maskKey,
} from "../utils/crypto.js";
import { loadAiSettings } from "../services/aiSetup.js";
import { testAiKey as runKeyTest } from "../services/aiKeyPool.js";

// Only the last four characters of a stored key leave the server.
const buildKeyResponse = (keyRecord, plainKey) => ({
  id: keyRecord.id,
  provider: keyRecord.provider,
  label: keyRecord.label,
  maskedKey: maskKey(plainKey || ""),
  enabled: keyRecord.enabled,
  status: keyRecord.status,
  cooldownUntil: keyRecord.cooldownUntil,
  lastUsedAt: keyRecord.lastUsedAt,
  usageCount: keyRecord.usageCount,
  lastError: keyRecord.lastError,
});

export const listAiKeys = asyncHandler(async (req, res) => {
  const keyRecords = await AiKey.find()
    .sort({ createdAt: 1 })
    .select("+encryptedKey");

  res.json({
    success: true,
    data: {
      keys: keyRecords.map((keyRecord) =>
        buildKeyResponse(keyRecord, decryptSecret(keyRecord.encryptedKey))
      ),
    },
  });
});

export const createAiKey = asyncHandler(async (req, res) => {
  const { provider, label, apiKey } = req.body;
  const keyRecord = await AiKey.create({
    provider,
    label,
    encryptedKey: encryptSecret(apiKey),
  });

  res.status(201).json({
    success: true,
    data: { key: buildKeyResponse(keyRecord, apiKey) },
    message: "Key added",
  });
});

const readKeyUpdates = (body) => {
  const updates = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  if (body.apiKey) {
    updates.encryptedKey = encryptSecret(body.apiKey);
    updates.status = "active";
    updates.cooldownUntil = null;
    updates.lastError = "";
  }

  return updates;
};

export const updateAiKey = asyncHandler(async (req, res) => {
  const keyRecord = await AiKey.findByIdAndUpdate(
    req.params.id,
    { $set: readKeyUpdates(req.body) },
    { new: true }
  ).select("+encryptedKey");

  if (!keyRecord) throw new ApiError(404, "Key not found");

  res.json({
    success: true,
    data: {
      key: buildKeyResponse(
        keyRecord,
        req.body.apiKey || decryptSecret(keyRecord.encryptedKey)
      ),
    },
    message: "Key updated",
  });
});

export const deleteAiKey = asyncHandler(async (req, res) => {
  const keyRecord = await AiKey.findByIdAndDelete(req.params.id);
  if (!keyRecord) throw new ApiError(404, "Key not found");

  res.json({
    success: true,
    data: { id: req.params.id },
    message: "Key deleted",
  });
});

export const testStoredAiKey = asyncHandler(async (req, res) => {
  const keyRecord = await AiKey.findById(req.params.id).select(
    "+encryptedKey"
  );
  if (!keyRecord) throw new ApiError(404, "Key not found");

  const testResult = await runKeyTest(keyRecord);

  res.json({
    success: true,
    data: testResult,
    message: testResult.ok ? "Key works" : "Key failed the test",
  });
});

export const getAiSettings = asyncHandler(async (req, res) => {
  const settings = await loadAiSettings();
  res.json({ success: true, data: { settings } });
});

const trimTrailingSlashes = (value) => value.replace(/\/+$/, "");

export const updateAiSettings = asyncHandler(async (req, res) => {
  const settingsUpdates = { ...req.body };
  if (settingsUpdates.geminiBaseUrl) {
    settingsUpdates.geminiBaseUrl = trimTrailingSlashes(
      settingsUpdates.geminiBaseUrl
    );
  }
  if (settingsUpdates.grokBaseUrl) {
    settingsUpdates.grokBaseUrl = trimTrailingSlashes(
      settingsUpdates.grokBaseUrl
    );
  }

  await loadAiSettings();

  const settings = await AiSettings.findOneAndUpdate(
    {},
    { $set: settingsUpdates },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: { settings },
    message: "Settings updated",
  });
});
