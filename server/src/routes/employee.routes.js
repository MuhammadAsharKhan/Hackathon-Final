import { Router } from "express";
import {
  downloadImportTemplate,
  exportEmployees,
  getEmployeeById,
  getEmployeeProfile360,
  importEmployees,
  listEmployees,
  registerEmployee,
  updateEmployee,
  updateEmployeeSalary,
} from "../controllers/employee.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { csvUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  employeeIdParamSchema,
  importQuerySchema,
  listEmployeesQuerySchema,
  monthQuerySchema,
  registerEmployeeSchema,
  updateEmployeeSchema,
  updateSalarySchema,
} from "../validators/employee.validators.js";

const router = Router();

router.use(protect);

router.get("/export", restrictTo("hr"), exportEmployees);
router.get("/import/template", restrictTo("hr"), downloadImportTemplate);
router.post(
  "/import",
  restrictTo("hr"),
  csvUpload,
  validate(importQuerySchema, "query"),
  importEmployees
);

router.get(
  "/",
  restrictTo("admin", "hr"),
  validate(listEmployeesQuerySchema, "query"),
  listEmployees
);
router.post("/", restrictTo("hr"), validate(registerEmployeeSchema), registerEmployee);

router.get(
  "/:id",
  restrictTo("admin", "hr", "employee"),
  validate(employeeIdParamSchema, "params"),
  getEmployeeById
);
router.get(
  "/:id/360",
  restrictTo("admin", "hr", "employee"),
  validate(employeeIdParamSchema, "params"),
  validate(monthQuerySchema, "query"),
  getEmployeeProfile360
);
router.patch(
  "/:id",
  restrictTo("hr"),
  validate(employeeIdParamSchema, "params"),
  validate(updateEmployeeSchema),
  updateEmployee
);
router.patch(
  "/:id/salary",
  restrictTo("hr", "admin"),
  validate(employeeIdParamSchema, "params"),
  validate(updateSalarySchema),
  updateEmployeeSalary
);

export default router;
