import { z } from "zod";
import Department from "../models/Department.js";
import { isValidDateString, todayIn } from "../utils/dates.js";
import { round2 } from "../utils/money.js";
import {
  attendanceSummary,
  headcount,
  leaveSummary,
  loadAnalyticsRange,
  searchEmployees,
  topLateComers,
} from "./analyticsService.js";
import { summarizeEmployeeDays } from "./attendanceCalc.js";
import { getEmployeeDaysForRange } from "./attendanceService.js";
import { getBalancesForEmployee } from "./leaveService.js";
import { getRunSummary, payslipsForEmployee } from "./payrollService.js";
import { getSettings } from "./settingsService.js";

const dateSchema = z
  .string()
  .trim()
  .refine(isValidDateString, { message: "Date must be YYYY-MM-DD" });

const limitsSchema = z.coerce
  .number()
  .int()
  .default(5)
  .transform((value) => Math.min(Math.max(value, 1), 10));

const scopeProperties = {
  departmentName: {
    type: "string",
    description: "Department name, for example Engineering. Case does not matter.",
  },
  departmentId: {
    type: "string",
    description: "Department id. Prefer departmentName when you only know the name.",
  },
};

const rangeProperties = {
  from: { type: "string", description: "Start date as YYYY-MM-DD. Defaults to the first day of this month." },
  to: { type: "string", description: "End date as YYYY-MM-DD. Defaults to today." },
};

const scopeSchema = z.object({
  departmentName: z.string().trim().min(1).max(80).optional(),
  departmentId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const rangeSchema = scopeSchema.extend({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const percent = (ratio) => round2(Number(ratio ?? 0) * 100);

const todayOf = async (now) => {
  const settings = await getSettings();
  return todayIn(settings?.timezone, now);
};

const resolveScope = async (args) => {
  if (args.departmentId) {
    const exists = await Department.exists({ _id: args.departmentId });
    if (!exists) return { error: "department_not_found", department: args.departmentId };
    return { departmentId: args.departmentId, department: args.departmentId };
  }

  if (args.departmentName) {
    const department = await Department.findOne({
      name: new RegExp(`^${escapeRegex(args.departmentName)}$`, "i"),
    }).lean();
    if (!department) {
      return { error: "department_not_found", department: args.departmentName };
    }
    return { departmentId: String(department._id), department: department.name };
  }

  return { departmentId: null, department: "all departments" };
};

const resolveRange = async (args, now) => {
  const today = await todayOf(now);
  const from = args.from ?? `${today.slice(0, 7)}-01`;
  const to = args.to ?? today;

  if (from > to) return { error: "invalid_range", message: "from is after to" };
  return { from, to, today };
};

const NO_EMPLOYEE_RECORD = { error: "no_employee_record" };

const TOOL_SPECS = {
  get_headcount: {
    description:
      "Current employee headcount, optionally for one department. Returns the date and the number of employed people.",
    parameters: {
      type: "object",
      properties: { ...scopeProperties },
    },
    schema: scopeSchema.extend({}),
    run: async (args, context) => {
      const scope = await resolveScope(args);
      if (scope.error) return scope;

      const today = await todayOf(context.now);
      const result = await headcount({
        date: today,
        departmentId: scope.departmentId,
        now: context.now,
      });

      return { date: result.date, count: result.count, department: scope.department };
    },
  },

  get_attendance_summary: {
    description:
      "Attendance counts and rates for a date range, optionally for one department. Returns present, late, half day, absent, missing checkout and on-leave counts, plus the attendance rate, late percent and absenteeism as percentages. Dates are YYYY-MM-DD.",
    parameters: {
      type: "object",
      properties: { ...rangeProperties, ...scopeProperties },
    },
    schema: rangeSchema.extend({}),
    run: async (args, context) => {
      const range = await resolveRange(args, context.now);
      if (range.error) return range;
      const scope = await resolveScope(args);
      if (scope.error) return scope;

      const loaded = await loadAnalyticsRange({
        from: range.from,
        to: range.to,
        departmentId: scope.departmentId,
        now: context.now,
      });
      const summary = attendanceSummary(loaded);

      return {
        from: range.from,
        to: range.to,
        department: scope.department,
        employees: summary.employees,
        counts: summary.counts,
        attendanceRatePercent: percent(summary.attendanceRate),
        latePercent: percent(summary.latePercent),
        absenteeismPercent: percent(summary.absenteeism),
      };
    },
  },

  get_late_comers: {
    description:
      "Employees with late arrivals in a date range, worst first. Returns name, code, department and late day count only. The limit is clamped to 10. Dates are YYYY-MM-DD.",
    parameters: {
      type: "object",
      properties: {
        ...rangeProperties,
        ...scopeProperties,
        limit: {
          type: "number",
          description: "How many people to return, 1 to 10. Defaults to 5.",
        },
      },
    },
    schema: rangeSchema.extend({ limit: limitsSchema }),
    run: async (args, context) => {
      const range = await resolveRange(args, context.now);
      if (range.error) return range;
      const scope = await resolveScope(args);
      if (scope.error) return scope;

      const loaded = await loadAnalyticsRange({
        from: range.from,
        to: range.to,
        departmentId: scope.departmentId,
        now: context.now,
      });

      return {
        from: range.from,
        to: range.to,
        department: scope.department,
        lateComers: topLateComers(loaded, args.limit),
      };
    },
  },

  get_leave_summary: {
    description:
      "Approved leave days by leave type for a date range, plus who is on leave today with their leave type. Dates are YYYY-MM-DD.",
    parameters: {
      type: "object",
      properties: { ...rangeProperties, ...scopeProperties },
    },
    schema: rangeSchema.extend({}),
    run: async (args, context) => {
      const range = await resolveRange(args, context.now);
      if (range.error) return range;
      const scope = await resolveScope(args);
      if (scope.error) return scope;

      const loaded = await loadAnalyticsRange({
        from: range.from,
        to: range.to,
        departmentId: scope.departmentId,
        now: context.now,
      });
      const summary = await leaveSummary(loaded, { now: context.now });

      return {
        from: range.from,
        to: range.to,
        department: scope.department,
        daysByType: summary.byType,
        onLeaveToday: summary.onLeaveToday.map((row) => ({
          name: row.name,
          code: row.code,
          leaveType: row.leaveTypeName,
        })),
      };
    },
  },

  get_payroll_summary: {
    description:
      "Payroll run status and totals for one month: employee count, gross, deductions, tax and net. Month is YYYY-MM and defaults to this month. Returns status missing when no run exists.",
    parameters: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month as YYYY-MM. Defaults to this month." },
      },
    },
    schema: z.object({
      month: z
        .string()
        .trim()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM")
        .optional(),
    }),
    run: async (args, context) => {
      const today = await todayOf(context.now);
      const summary = await getRunSummary(args.month ?? today.slice(0, 7));

      return {
        ...summary,
        note:
          summary.status === "missing"
            ? "No payroll run exists for this month yet."
            : undefined,
      };
    },
  },

  search_employees: {
    description:
      "Find employees by name, employee code or email. Returns name, code, department, designation and status only, never salary. The limit is clamped to 25.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, employee code or email to search for." },
        ...scopeProperties,
      },
      required: ["query"],
    },
    schema: scopeSchema.extend({
      query: z.string().trim().min(1).max(80),
    }),
    run: async (args, context) => {
      const scope = await resolveScope(args);
      if (scope.error) return scope;

      return {
        department: scope.department,
        employees: await searchEmployees({
          query: args.query,
          departmentId: scope.departmentId,
          limit: 10,
        }),
      };
    },
  },

  get_my_leave_balance: {
    description:
      "The signed-in person's own leave balance per leave type: quota, used, pending and remaining. Year is YYYY and defaults to this year.",
    parameters: {
      type: "object",
      properties: {
        year: { type: "number", description: "Year as a number. Defaults to this year." },
      },
    },
    schema: z.object({
      year: z.coerce.number().int().min(2000).max(2100).optional(),
    }),
    run: async (args, context) => {
      if (!context.employeeId) return NO_EMPLOYEE_RECORD;
      const result = await getBalancesForEmployee(
        context.employeeId,
        args.year,
        context.now
      );

      return { year: result.year, balances: result.balances };
    },
  },

  get_my_attendance_summary: {
    description:
      "The signed-in person's own attendance for a date range: counts by status, worked hours, late count and the attendance rate. Dates are YYYY-MM-DD.",
    parameters: {
      type: "object",
      properties: {
        from: rangeProperties.from,
        to: rangeProperties.to,
      },
    },
    schema: z.object({
      from: dateSchema.optional(),
      to: dateSchema.optional(),
    }),
    run: async (args, context) => {
      if (!context.employeeId) return NO_EMPLOYEE_RECORD;
      const range = await resolveRange(args, context.now);
      if (range.error) return range;

      const daysByEmployee = await getEmployeeDaysForRange(
        [context.employeeId],
        range.from,
        range.to,
        { now: context.now }
      );
      const summary = summarizeEmployeeDays(
        daysByEmployee.get(String(context.employeeId)) ?? []
      );

      return { from: range.from, to: range.to, summary };
    },
  },

  get_my_last_payslip: {
    description:
      "The signed-in person's own most recent finalized payslip: month, gross, deductions, tax and net pay.",
    parameters: { type: "object", properties: {} },
    schema: z.object({}),
    run: async (args, context) => {
      if (!context.employeeId) return NO_EMPLOYEE_RECORD;

      const [payslip] = await payslipsForEmployee(context.employeeId, 1);
      if (!payslip) return { note: "No finalized payslip found for this account." };

      return {
        month: payslip.month,
        gross: payslip.gross,
        attendanceDeduction: payslip.attendanceDeduction,
        tax: payslip.tax,
        netPay: payslip.netPay,
      };
    },
  },
};

const ORG_TOOLS = [
  "get_headcount",
  "get_attendance_summary",
  "get_late_comers",
  "get_leave_summary",
  "get_payroll_summary",
  "search_employees",
];

const OWN_TOOLS = [
  "get_my_leave_balance",
  "get_my_attendance_summary",
  "get_my_last_payslip",
];

export const toolNamesForRole = (role) =>
  role === "employee" ? [...OWN_TOOLS] : [...ORG_TOOLS, ...OWN_TOOLS];

export const toolsForRole = (role) =>
  toolNamesForRole(role).map((name) => ({
    name,
    description: TOOL_SPECS[name].description,
    parameters: TOOL_SPECS[name].parameters,
  }));

// Models fill an optional argument they have nothing for with null or an empty
// string. Both mean "not provided", and every schema here rejects a blank
// value, so they are dropped before validation instead of failing the call.
const withoutBlanks = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== null && entry !== undefined && entry !== ""
    )
  );
};

// The model may name a tool it was not given, or send arguments that break the
// schema. Both go back as a result the model can recover from. The allowed list
// is the role scope, so an employee cannot reach an org tool by naming it.
export const executeTool = async (name, rawArguments, context, allowedNames = null) => {
  if (allowedNames && !allowedNames.includes(name)) {
    return { error: "unknown_tool", tool: name };
  }

  const spec = TOOL_SPECS[name];
  if (!spec) return { error: "unknown_tool", tool: name };

  const parsed = spec.schema.safeParse(withoutBlanks(rawArguments ?? {}));
  if (!parsed.success) {
    return {
      error: "invalid_arguments",
      tool: name,
      details: parsed.error.issues.map((issue) => issue.message),
    };
  }

  try {
    return await spec.run(parsed.data, context);
  } catch (error) {
    console.warn(`AI tool ${name} failed: ${error.message}`);
    return { error: "unavailable" };
  }
};
