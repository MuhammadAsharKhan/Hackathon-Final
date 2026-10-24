import { Router } from "express";
import {
  getAdminDashboard,
  getHrDashboard,
  getMyDashboard,
} from "../controllers/dashboard.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dashboardQuerySchema } from "../validators/dashboard.validators.js";

const router = Router();

router.use(protect);

router.get(
  "/admin",
  restrictTo("admin"),
  validate(dashboardQuerySchema, "query"),
  getAdminDashboard
);
// The Admin reads the HR view for the day to day numbers (spec section 5).
router.get(
  "/hr",
  restrictTo("hr", "admin"),
  validate(dashboardQuerySchema, "query"),
  getHrDashboard
);
router.get(
  "/me",
  restrictTo("hr", "employee"),
  validate(dashboardQuerySchema, "query"),
  getMyDashboard
);

export default router;
