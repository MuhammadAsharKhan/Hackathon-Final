import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import PayrollRun from "../models/PayrollRun.js";
import Payslip from "../models/Payslip.js";
import ApiError from "../utils/ApiError.js";
import { now } from "../utils/clock.js";
import { monthBounds, todayIn } from "../utils/dates.js";
import { round2 } from "../utils/money.js";
import { getEmployeeDaysForRange } from "./attendanceService.js";
import { log } from "./auditService.js";
import { getCalendar } from "./calendarService.js";
import { notifyMany } from "./notificationService.js";
import { calculatePayslip } from "./payrollCalc.js";
import { getSettings } from "./settingsService.js";

const orgNameMaps = async () => {
  const [departments, designations] = await Promise.all([
    Department.find().select("name").lean(),
    Designation.find().select("name").lean(),
  ]);

  return {
    departments: new Map(departments.map((item) => [String(item._id), item.name])),
    designations: new Map(
      designations.map((item) => [String(item._id), item.name])
    ),
  };
};

const employeesForMonth = (start, end) =>
  Employee.find({
    basicSalary: { $gt: 0 },
    joinDate: { $lte: end },
    $or: [{ exitDate: null }, { exitDate: { $gte: start } }],
  });

const sumField = (rows, field) =>
  round2(rows.reduce((total, row) => total + Number(row[field] ?? 0), 0));

// Every payslip is built before anything is written, then the draft is replaced
// in one delete and one insert.
export const createOrRecalculateRun = async (
  actor,
  month,
  { now: currentInstant = now() } = {}
) => {
  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);

  if (month > today.slice(0, 7)) {
    throw new ApiError(422, "A future month cannot be processed");
  }

  const existingRun = await PayrollRun.findOne({ month });
  if (existingRun?.status === "finalized") {
    throw new ApiError(409, "This month is already finalized");
  }

  const { start, end } = monthBounds(month);
  const { holidaySet } = await getCalendar(start, end);
  const employees = await employeesForMonth(start, end);
  const [daysByEmployee, names] = await Promise.all([
    getEmployeeDaysForRange(
      employees.map((employee) => String(employee.id)),
      start,
      end,
      { now: currentInstant }
    ),
    orgNameMaps(),
  ]);

  const payslips = [];
  for (const employee of employees) {
    const days = daysByEmployee.get(String(employee.id)) ?? [];
    const numbers = calculatePayslip({
      employee,
      month,
      settings,
      holidaySet,
      days,
      today,
    });

    if (numbers.eligibleDays <= 0) continue;

    payslips.push({
      employeeId: employee.id,
      month,
      snapshot: {
        employeeCode: employee.code,
        employeeName: employee.name,
        department: names.departments.get(String(employee.departmentId)) ?? "",
        designation: names.designations.get(String(employee.designationId)) ?? "",
      },
      ...numbers,
    });
  }

  const before = existingRun
    ? { status: existingRun.status, totals: existingRun.totals }
    : null;

  const created = !existingRun;
  const run =
    existingRun ??
    (await PayrollRun.create({ month, status: "draft", createdBy: actor.id }));

  await Payslip.deleteMany({ runId: run.id });
  if (payslips.length > 0) {
    await Payslip.insertMany(
      payslips.map((payslip) => ({ ...payslip, runId: run.id }))
    );
  }

  run.status = "draft";
  run.createdBy = run.createdBy ?? actor.id;
  run.totals = {
    employees: payslips.length,
    gross: sumField(payslips, "gross"),
    deductions: sumField(payslips, "attendanceDeduction"),
    tax: sumField(payslips, "tax"),
    net: sumField(payslips, "netPay"),
  };
  await run.save();

  await log(
    actor,
    created ? "payroll.create" : "payroll.recalculate",
    "payrollRun",
    run.id,
    before,
    { month, status: run.status, totals: run.totals }
  );

  return { run, created };
};

export const listRuns = async (query) => {
  const [runs, total] = await Promise.all([
    PayrollRun.find()
      .sort({ month: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    PayrollRun.countDocuments(),
  ]);

  return {
    runs,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getRun = async (runId) => {
  const run = await PayrollRun.findById(runId);
  if (!run) throw new ApiError(404, "Payroll run not found");

  const payslips = await Payslip.find({ runId: run.id }).sort({
    "snapshot.employeeCode": 1,
  });

  return { run, payslips };
};

export const finalizeRun = async (
  actor,
  runId,
  { now: currentInstant = now() } = {}
) => {
  const run = await PayrollRun.findById(runId);
  if (!run) throw new ApiError(404, "Payroll run not found");
  if (run.status === "finalized") {
    throw new ApiError(409, "This month is already finalized");
  }

  const payslips = await Payslip.find({ runId: run.id }).select("employeeId").lean();
  if (payslips.length === 0) {
    throw new ApiError(422, "This run has no payslips to finalize");
  }

  run.status = "finalized";
  run.finalizedBy = actor.id;
  run.finalizedAt = currentInstant;
  await run.save();

  const employees = await Employee.find({
    _id: { $in: payslips.map((payslip) => payslip.employeeId) },
    userId: { $ne: null },
  })
    .select("userId")
    .lean();

  await notifyMany(
    employees.map((employee) => ({
      userId: employee.userId,
      type: "payroll",
      title: "Payslip ready",
      message: `Your payslip for ${run.month} is ready`,
      link: "/me/payslips",
    }))
  );

  await log(
    actor,
    "payroll.finalize",
    "payrollRun",
    run.id,
    { status: "draft", totals: run.totals },
    { status: "finalized", totals: run.totals }
  );

  return run;
};

export const getRunSummary = async (month) => {
  const run = await PayrollRun.findOne({ month }).lean();
  if (!run) return { month, status: "missing", totals: null };

  return {
    month,
    status: run.status,
    totals: run.totals,
    finalizedAt: run.finalizedAt,
  };
};

const finalizedRuns = () =>
  PayrollRun.find({ status: "finalized" }).select("_id month").lean();

export const listMyPayslips = async (actor) => {
  if (!actor.employeeId) {
    throw new ApiError(403, "This account has no employee record");
  }

  const runs = await finalizedRuns();
  const payslips = await Payslip.find({
    employeeId: actor.employeeId,
    runId: { $in: runs.map((run) => run._id) },
  }).sort({ month: -1 });

  return { payslips };
};

export const findPayslipFor = async (actor, payslipId) => {
  const payslip = await Payslip.findById(payslipId);
  if (!payslip) throw new ApiError(404, "Payslip not found");

  const run = await PayrollRun.findById(payslip.runId).select("status month").lean();

  if (actor.role === "employee") {
    if (!actor.employeeId || String(payslip.employeeId) !== String(actor.employeeId)) {
      throw new ApiError(403, "This payslip belongs to someone else");
    }
    if (run?.status !== "finalized") {
      throw new ApiError(403, "This payslip is not available yet");
    }
  }

  return { payslip, run };
};

export const payslipsForEmployee = async (employeeId, limit = 12) => {
  const runs = await finalizedRuns();
  return Payslip.find({
    employeeId,
    runId: { $in: runs.map((run) => run._id) },
  })
    .sort({ month: -1 })
    .limit(limit);
};
