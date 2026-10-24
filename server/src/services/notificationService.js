import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const notify = (entry) => Notification.create(entry);

export const notifyMany = async (entries) => {
  if (!entries || entries.length === 0) return [];
  return Notification.insertMany(entries);
};

// Used by announcements: one row per active account, minus the author.
export const notifyActiveUsers = async ({
  excludeUserId,
  type,
  title,
  message,
  link = "",
}) => {
  const filter = { isActive: true };
  if (excludeUserId) filter._id = { $ne: excludeUserId };

  const recipients = await User.find(filter).select("_id").lean();

  return notifyMany(
    recipients.map((recipient) => ({
      userId: recipient._id,
      type,
      title,
      message,
      link,
    }))
  );
};
