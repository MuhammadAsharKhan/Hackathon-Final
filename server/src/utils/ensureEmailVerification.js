import User from "../models/User.js";
import PasswordOtp from "../models/PasswordOtp.js";
import { PASSWORD_RESET } from "./otp.js";

// Accounts created before email verification existed keep working. The old
// unique index on userId also has to go, because one user now holds a code per
// purpose.
export const ensureEmailVerification = async () => {
  const backfill = await User.collection.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true } }
  );

  await PasswordOtp.collection.updateMany(
    { purpose: { $exists: false } },
    { $set: { purpose: PASSWORD_RESET } }
  );
  await PasswordOtp.collection.dropIndex("userId_1").catch(() => {});

  if (backfill.modifiedCount > 0) {
    console.log(`Marked ${backfill.modifiedCount} users as verified`);
  }
};
