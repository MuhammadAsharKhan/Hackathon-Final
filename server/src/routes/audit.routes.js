import { Router } from "express";
import { listAuditLogs } from "../controllers/audit.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { auditQuerySchema } from "../validators/audit.validators.js";

const router = Router();

router.get(
  "/",
  protect,
  restrictTo("admin"),
  validate(auditQuerySchema, "query"),
  listAuditLogs
);

export default router;
