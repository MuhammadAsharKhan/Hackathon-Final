import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const notify = (entry) => Notification.create(entry);

export const notifyMany = async (entries) => {
  if (!entries || entries.length === 0) return [];
  return Notification.insertMany(entries);
};

// Employees write to every HR user. When the requester is HR, the admins are
// told as well, because HR cannot decide its own request.
export const notifyApprovers = async ({
  requesterUserId,
  requesterRole,
  type,
  title,
  message,
  link = "",
}) => {
  const roles = requesterRole === "hr" ? ["hr", "admin"] : ["hr"];
  const approvers = await User.find({
    role: { $in: roles },
    isActive: true,
    _id: { $ne: requesterUserId },
  })
    .select("_id")
    .lean();

  return notifyMany(
    approvers.map((approver) => ({
      userId: approver._id,
      type,
      title,
      message,
      link,
    }))
  );
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
