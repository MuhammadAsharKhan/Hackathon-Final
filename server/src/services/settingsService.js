import Settings, { SETTINGS_ID } from "../models/Settings.js";

// Settings are read on almost every request, so they are cached briefly. Every
// write clears the cache, which keeps a change visible on the next request.
const CACHE_MS = 30 * 1000;

let cachedSettings = null;
let cachedAt = 0;

export const clearSettingsCache = () => {
  cachedSettings = null;
  cachedAt = 0;
};

export const getSettings = async ({ skipCache = false } = {}) => {
  const cacheIsFresh = cachedSettings && Date.now() - cachedAt < CACHE_MS;
  if (cacheIsFresh && !skipCache) return cachedSettings;

  cachedSettings = await Settings.findById(SETTINGS_ID);
  cachedAt = Date.now();

  return cachedSettings;
};

export const updateSettings = async (updates) => {
  const settings = await Settings.findOneAndUpdate(
    { _id: SETTINGS_ID },
    { $set: updates },
    { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
  );

  clearSettingsCache();
  return settings;
};
