import { Router } from "express";
import {
  createLeaveRequest,
  getLeaveBalance,
  getLeaveRequests,
  patchLeaveCancel,
  patchLeaveDecision,
  previewLeaveRequest,
} from "../controllers/leave.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  balanceQuerySchema,
  createLeaveRequestSchema,
  leaveDecisionSchema,
  leaveRequestIdParamSchema,
  leaveRequestListQuerySchema,
  previewLeaveSchema,
} from "../validators/leave.validators.js";

const router = Router();

router.use(protect);

router.get(
  "/balance",
  restrictTo("hr", "employee"),
  validate(balanceQuerySchema, "query"),
  getLeaveBalance
);
router.post(
  "/preview",
  restrictTo("hr", "employee"),
  validate(previewLeaveSchema),
  previewLeaveRequest
);
router.post(
  "/requests",
  restrictTo("hr", "employee"),
  validate(createLeaveRequestSchema),
  createLeaveRequest
);
router.get(
  "/requests",
  restrictTo("admin", "hr", "employee"),
  validate(leaveRequestListQuerySchema, "query"),
  getLeaveRequests
);
router.patch(
  "/requests/:id/cancel",
  restrictTo("hr", "employee"),
  validate(leaveRequestIdParamSchema, "params"),
  patchLeaveCancel
);
router.patch(
  "/requests/:id/decision",
  restrictTo("hr", "admin"),
  validate(leaveRequestIdParamSchema, "params"),
  validate(leaveDecisionSchema),
  patchLeaveDecision
);

export default router;
