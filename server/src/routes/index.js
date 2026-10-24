import { Router } from "express";
import aiRoutes from "./ai.routes.js";
import announcementRoutes from "./announcement.routes.js";
import auditRoutes from "./audit.routes.js";
import authRoutes from "./auth.routes.js";
import departmentRoutes from "./department.routes.js";
import designationRoutes from "./designation.routes.js";
import holidayRoutes from "./holiday.routes.js";
import leaveTypeRoutes from "./leaveType.routes.js";
import meRoutes from "./me.routes.js";
import notificationRoutes from "./notification.routes.js";
import settingsRoutes from "./settings.routes.js";
import setupRoutes from "./setup.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/setup", setupRoutes);
router.use("/settings", settingsRoutes);
router.use("/departments", departmentRoutes);
router.use("/designations", designationRoutes);
router.use("/leave-types", leaveTypeRoutes);
router.use("/holidays", holidayRoutes);
router.use("/users", userRoutes);
router.use("/me", meRoutes);
router.use("/announcements", announcementRoutes);
router.use("/notifications", notificationRoutes);
router.use("/audit", auditRoutes);
router.use(aiRoutes);

export default router;
