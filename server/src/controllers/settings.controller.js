import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "../services/auditService.js";
import { getSettings, updateSettings } from "../services/settingsService.js";

export const getCompanySettings = asyncHandler(async (req, res) => {
  const settings = await getSettings({ skipCache: true });
  if (!settings) throw new ApiError(404, "Company settings are not set up yet");

  res.json({ success: true, data: { settings } });
});

export const patchCompanySettings = asyncHandler(async (req, res) => {
  const before = await getSettings({ skipCache: true });
  const settings = await updateSettings(req.body);

  await log(
    req.user,
    "settings.update",
    "settings",
    settings.id,
    before,
    settings
  );

  res.json({
    success: true,
    data: { settings },
    message: "Settings updated",
  });
});
