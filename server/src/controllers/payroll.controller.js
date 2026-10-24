import { asyncHandler } from "../utils/asyncHandler.js";
import { getSettings } from "../services/settingsService.js";
import {
  createOrRecalculateRun,
  finalizeRun,
  findPayslipFor,
  getRun,
  listMyPayslips,
  listRuns,
} from "../services/payrollService.js";
import { payslipFileName, writePayslipPdf } from "../services/payslipPdf.js";

export const postPayrollRun = asyncHandler(async (req, res) => {
  const { run, created } = await createOrRecalculateRun(req.user, req.body.month);

  res.status(created ? 201 : 200).json({
    success: true,
    data: { run },
    message: created ? "Payroll draft created" : "Payroll draft recalculated",
  });
});

export const getPayrollRuns = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await listRuns(req.query),
  });
});

export const getPayrollRun = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getRun(req.params.id),
  });
});

export const postPayrollFinalize = asyncHandler(async (req, res) => {
  const run = await finalizeRun(req.user, req.params.id);

  res.json({
    success: true,
    data: { run },
    message: "Payroll finalized",
  });
});

export const getMyPayslips = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await listMyPayslips(req.user),
  });
});

export const getPayslip = asyncHandler(async (req, res) => {
  const { payslip, run } = await findPayslipFor(req.user, req.params.id);

  res.json({
    success: true,
    data: { payslip, run: run ? { month: run.month, status: run.status } : null },
  });
});

export const getPayslipPdf = asyncHandler(async (req, res) => {
  const { payslip } = await findPayslipFor(req.user, req.params.id);
  const settings = await getSettings();

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${payslipFileName(payslip)}"`
  );

  writePayslipPdf(res, { payslip, settings });
});
