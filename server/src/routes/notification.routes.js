import { Router } from "express";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import { notificationQuerySchema } from "../validators/notification.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });

router.use(protect);

router.get("/", validate(notificationQuerySchema, "query"), listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", validate(idSchema, "params"), markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

export default router;
