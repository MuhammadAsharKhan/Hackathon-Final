import { z } from "zod";
import {
  limitSchema,
  monthStringSchema,
  objectIdSchema,
  pageSchema,
} from "./common.validators.js";

export const runPayrollSchema = z.object({
  month: monthStringSchema,
});

export const payrollRunIdParamSchema = z.object({ id: objectIdSchema });

export const payslipIdParamSchema = z.object({ id: objectIdSchema });

export const payrollRunListQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});
