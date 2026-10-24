import { Router } from "express";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "../controllers/department.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { objectIdSchema } from "../validators/common.validators.js";
import {
  createDepartmentSchema,
  departmentQuerySchema,
  updateDepartmentSchema,
} from "../validators/department.validators.js";
import { z } from "zod";

const router = Router();
const idSchema = z.object({ id: objectIdSchema });

router.use(protect);

router.get("/", validate(departmentQuerySchema, "query"), listDepartments);
router.post("/", restrictTo("admin"), validate(createDepartmentSchema), createDepartment);
router.patch(
  "/:id",
  restrictTo("admin"),
  validate(idSchema, "params"),
  validate(updateDepartmentSchema),
  updateDepartment
);
router.delete("/:id", restrictTo("admin"), validate(idSchema, "params"), deleteDepartment);

export default router;
