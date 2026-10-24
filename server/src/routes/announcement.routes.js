import { Router } from "express";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
} from "../controllers/announcement.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import {
  announcementQuerySchema,
  createAnnouncementSchema,
} from "../validators/announcement.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });

router.use(protect);

router.get("/", validate(announcementQuerySchema, "query"), listAnnouncements);
router.post(
  "/",
  restrictTo("admin", "hr"),
  validate(createAnnouncementSchema),
  createAnnouncement
);
router.delete("/:id", restrictTo("admin", "hr"), validate(idSchema, "params"), deleteAnnouncement);

export default router;
