import { Router } from "express";
import {
  createLeaveType,
  deleteLeaveType,
  listLeaveTypes,
  updateLeaveType,
} from "../controllers/leaveType.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
} from "../validators/leaveType.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });

router.use(protect);

router.get("/", listLeaveTypes);
router.post("/", restrictTo("admin"), validate(createLeaveTypeSchema), createLeaveType);
router.patch(
  "/:id",
  restrictTo("admin"),
  validate(idSchema, "params"),
  validate(updateLeaveTypeSchema),
  updateLeaveType
);
router.delete("/:id", restrictTo("admin"), validate(idSchema, "params"), deleteLeaveType);

export default router;
