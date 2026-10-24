import Announcement from "../models/Announcement.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "../services/auditService.js";
import { notifyActiveUsers } from "../services/notificationService.js";

export const listAnnouncements = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const [announcements, total] = await Promise.all([
    Announcement.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Announcement.countDocuments(),
  ]);

  res.json({
    success: true,
    data: {
      announcements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({
    title: req.body.title,
    body: req.body.body,
    authorId: req.user.id,
    authorName: req.user.name,
    authorRole: req.user.role,
  });

  await notifyActiveUsers({
    excludeUserId: req.user.id,
    type: "announcement",
    title: "New announcement",
    message: announcement.title,
    link: "/announcements",
  });

  await log(
    req.user,
    "announcement.create",
    "announcement",
    announcement.id,
    null,
    announcement
  );

  res.status(201).json({
    success: true,
    data: { announcement },
    message: "Announcement posted",
  });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new ApiError(404, "Announcement not found");

  const isAuthor = String(announcement.authorId) === req.user.id;
  if (req.user.role !== "admin" && !isAuthor) {
    throw new ApiError(403, "Only the author or an admin can delete this");
  }

  const before = announcement.toJSON();
  await announcement.deleteOne();
  await log(
    req.user,
    "announcement.delete",
    "announcement",
    announcement.id,
    before,
    null
  );

  res.json({
    success: true,
    data: { deleted: true },
    message: "Announcement deleted",
  });
});
