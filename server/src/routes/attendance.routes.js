import { Router } from "express";
import {
  deleteEmployeeFace,
  deleteOwnFace,
  getAttendanceBoard,
  getCorrections,
  getEmployeeAttendance,
  getMyAttendance,
  getOwnFaceStatus,
  getToday,
  patchCorrection,
  postCheckIn,
  postCheckOut,
  postCorrection,
  postFaceEnroll,
} from "../controllers/attendance.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { faceEnrollLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
  attendanceMonthQuerySchema,
  boardQuerySchema,
  checkInSchema,
  checkOutSchema,
  correctionDecisionSchema,
  correctionIdParamSchema,
  correctionListQuerySchema,
  createCorrectionSchema,
  employeeAttendanceParamsSchema,
  faceEnrollSchema,
  faceRemoveParamsSchema,
} from "../validators/attendance.validators.js";

const router = Router();

router.use(protect);

router.get("/today", restrictTo("hr", "employee"), getToday);
router.post("/check-in", restrictTo("hr", "employee"), validate(checkInSchema), postCheckIn);
router.post(
  "/check-out",
  restrictTo("hr", "employee"),
  validate(checkOutSchema),
  postCheckOut
);
router.get("/face/status", restrictTo("hr", "employee"), getOwnFaceStatus);
router.post(
  "/face/enroll",
  restrictTo("hr", "employee"),
  faceEnrollLimiter,
  validate(faceEnrollSchema),
  postFaceEnroll
);
router.delete("/face/enroll", restrictTo("hr", "employee"), deleteOwnFace);
router.delete(
  "/face/:employeeId/enroll",
  restrictTo("hr"),
  validate(faceRemoveParamsSchema, "params"),
  deleteEmployeeFace
);
router.get(
  "/me",
  restrictTo("hr", "employee"),
  validate(attendanceMonthQuerySchema, "query"),
  getMyAttendance
);
router.get(
  "/board",
  restrictTo("admin", "hr"),
  validate(boardQuerySchema, "query"),
  getAttendanceBoard
);
router.get(
  "/employee/:employeeId",
  restrictTo("admin", "hr"),
  validate(employeeAttendanceParamsSchema, "params"),
  validate(attendanceMonthQuerySchema, "query"),
  getEmployeeAttendance
);
router.post(
  "/corrections",
  restrictTo("hr", "employee"),
  validate(createCorrectionSchema),
  postCorrection
);
router.get(
  "/corrections",
  restrictTo("admin", "hr", "employee"),
  validate(correctionListQuerySchema, "query"),
  getCorrections
);
router.patch(
  "/corrections/:id",
  restrictTo("hr", "admin"),
  validate(correctionIdParamSchema, "params"),
  validate(correctionDecisionSchema),
  patchCorrection
);

export default router;
