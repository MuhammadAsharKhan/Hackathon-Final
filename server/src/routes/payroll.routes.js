import { Router } from "express";
import {
  getMyPayslips,
  getPayrollRun,
  getPayrollRuns,
  getPayslip,
  getPayslipPdf,
  postPayrollFinalize,
  postPayrollRun,
} from "../controllers/payroll.controller.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  payrollRunIdParamSchema,
  payrollRunListQuerySchema,
  payslipIdParamSchema,
  runPayrollSchema,
} from "../validators/payroll.validators.js";

const router = Router();

router.use(protect);

router.post(
  "/runs",
  restrictTo("hr"),
  validate(runPayrollSchema),
  postPayrollRun
);
router.get(
  "/runs",
  restrictTo("admin", "hr"),
  validate(payrollRunListQuerySchema, "query"),
  getPayrollRuns
);
router.get(
  "/runs/:id",
  restrictTo("admin", "hr"),
  validate(payrollRunIdParamSchema, "params"),
  getPayrollRun
);
router.post(
  "/runs/:id/finalize",
  restrictTo("admin"),
  validate(payrollRunIdParamSchema, "params"),
  postPayrollFinalize
);

router.get("/payslips/me", restrictTo("hr", "employee"), getMyPayslips);
router.get(
  "/payslips/:id/pdf",
  restrictTo("admin", "hr", "employee"),
  validate(payslipIdParamSchema, "params"),
  getPayslipPdf
);
router.get(
  "/payslips/:id",
  restrictTo("admin", "hr", "employee"),
  validate(payslipIdParamSchema, "params"),
  getPayslip
);

export default router;
