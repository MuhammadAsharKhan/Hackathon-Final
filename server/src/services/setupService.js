import LeaveType from "../models/LeaveType.js";
import Settings, { SETTINGS_ID } from "../models/Settings.js";
import User from "../models/User.js";
import { config } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { log } from "./auditService.js";
import { clearSettingsCache, updateSettings } from "./settingsService.js";

const SEED_LEAVE_TYPES = [
  { code: "annual", name: "Annual", yearlyQuota: 14, isPaid: true },
  { code: "sick", name: "Sick", yearlyQuota: 8, isPaid: true },
  { code: "casual", name: "Casual", yearlyQuota: 10, isPaid: true },
  { code: "unpaid", name: "Unpaid", yearlyQuota: null, isPaid: false },
];

export const seedLeaveTypes = async () => {
  if (SEED_LEAVE_TYPES.length === 0) return;

  await LeaveType.bulkWrite(
    SEED_LEAVE_TYPES.map((leaveType) => ({
      updateOne: {
        filter: { code: leaveType.code },
        update: { $setOnInsert: leaveType },
        upsert: true,
      },
    }))
  );
};

const createAdminUser = ({ name, email, password }) =>
  User.create({
    name,
    email,
    password,
    role: "admin",
    isActive: true,
    mustChangePassword: false,
  });

const adminActor = (user) => ({ id: user.id, name: user.name, role: user.role });

// The claim is one atomic update on the settings document. A second request
// either finds nothing to claim or hits the unique settings key, so exactly one
// setup call can win.
const claimSetup = async (companyName) => {
  const claimed = await Settings.findOneAndUpdate(
    { _id: SETTINGS_ID, setupComplete: false },
    { $set: { setupComplete: true, companyName } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).catch((error) => {
    if (error?.code === 11000) return null;
    throw error;
  });

  clearSettingsCache();
  return claimed;
};

const releaseSetupClaim = async () => {
  await Settings.updateOne(
    { _id: SETTINGS_ID, setupComplete: true },
    { $set: { setupComplete: false } }
  );
  clearSettingsCache();
};

export const completeSetup = async ({
  companyName,
  adminName,
  adminEmail,
  adminPassword,
}) => {
  const claimedSettings = await claimSetup(companyName);
  if (!claimedSettings) throw new ApiError(409, "Setup is already complete");

  let adminUser = null;
  try {
    adminUser = await createAdminUser({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
    });
    await seedLeaveTypes();
    await log(
      adminActor(adminUser),
      "setup.complete",
      "settings",
      claimedSettings.id,
      null,
      { companyName, adminEmail: adminUser.email }
    );
  } catch (error) {
    if (adminUser) await User.deleteOne({ _id: adminUser.id }).catch(() => {});
    await releaseSetupClaim().catch(() => {});
    throw error;
  }

  return { user: adminUser, settings: claimedSettings };
};

export const setupIsComplete = async () => {
  const settings = await Settings.findOne({ setupComplete: true }).select("_id");
  return Boolean(settings);
};

// On an empty database the environment may provide the first admin, so a fresh
// deployment is usable without opening the setup screen.
export const bootstrapAdminFromEnv = async () => {
  if (!config.adminEmail || !config.adminPassword) return;

  const existingAdmin = await User.exists({ role: "admin" });
  if (existingAdmin) return;

  const companyName = config.companyName;
  const adminUser = await createAdminUser({
    name: "Admin",
    email: config.adminEmail,
    password: config.adminPassword,
  });

  await seedLeaveTypes();
  const settings = await updateSettings({ companyName, setupComplete: true });
  await log(
    adminActor(adminUser),
    "setup.complete",
    "settings",
    settings.id,
    null,
    { companyName, adminEmail: adminUser.email }
  );

  console.log(`Admin created from environment: ${adminUser.email}`);
};
