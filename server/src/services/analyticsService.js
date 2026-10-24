import Attendance from "../models/Attendance.js";
import AttendanceCorrection from "../models/AttendanceCorrection.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import LeaveRequest from "../models/LeaveRequest.js";
import LeaveType from "../models/LeaveType.js";
import PayrollRun from "../models/PayrollRun.js";
import Payslip from "../models/Payslip.js";
import { now } from "../utils/clock.js";
import { addDays, todayIn, weekdayOf } from "../utils/dates.js";
import { round2 } from "../utils/money.js";
import {
  absenteeismOf,
  attendanceRateOf,
  attritionRate,
  countHeadcount,
  emptyAttendanceCounts,
  expectedDaysOf,
  isEmployedOn,
  latePercentOf,
  meanOf,
  tenureBucketOf,
} from "./analyticsCalc.js";
import { getEmployeeDaysForRange } from "./attendanceService.js";
import { grossOf } from "./payrollCalc.js";
import { getSettings } from "./settingsService.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const employedOnFilter = (date) => ({
  joinDate: { $lte: date },
  $or: [{ exitDate: null }, { exitDate: { $gt: date } }],
});

const nameMaps = async () => {
  const [departments, designations] = await Promise.all([
    Department.find().select("name").lean(),
    Designation.find().select("name").lean(),
  ]);

  return {
    departmentNames: new Map(
      departments.map((department) => [String(department._id), department.name])
    ),
    designationNames: new Map(
      designations.map((designation) => [String(designation._id), designation.name])
    ),
  };
};

// One loader per request. Dashboards pass the result into every metric so the
// attendance days are read once.
export const loadAnalyticsRange = async ({
  from,
  to,
  departmentId = null,
  now: currentInstant = now(),
}) => {
  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);

  const employeeFilter = {
    joinDate: { $lte: to },
    $or: [{ exitDate: null }, { exitDate: { $gte: from } }],
  };
  if (departmentId) employeeFilter.departmentId = departmentId;

  const [employees, leaveTypes, names, departments, designations] = await Promise.all([
    Employee.find(employeeFilter).lean(),
    LeaveType.find().select("code name isPaid yearlyQuota").lean(),
    nameMaps(),
    Department.find().select("name").lean(),
    Designation.find().select("name").lean(),
  ]);

  const employeeIds = employees.map((employee) => String(employee._id));
  const [daysByEmployee, leaves] = await Promise.all([
    getEmployeeDaysForRange(employeeIds, from, to, { now: currentInstant }),
    LeaveRequest.find({
      status: "approved",
      startDate: { $lte: to },
      endDate: { $gte: from },
      employeeId: { $in: employeeIds },
    }).lean(),
  ]);

  return {
    from,
    to,
    departmentId,
    today,
    settings,
    employees,
    daysByEmployee,
    leaves,
    leaveTypes,
    departments,
    designations,
    departmentNames: names.departmentNames,
    designationNames: names.designationNames,
  };
};

export const headcountAt = async (date) =>
  Employee.countDocuments(employedOnFilter(date));

export const headcount = async ({
  date,
  departmentId = null,
  now: currentInstant = now(),
} = {}) => {
  const settings = await getSettings();
  const target = date ?? todayIn(settings?.timezone, currentInstant);
  const filter = employedOnFilter(target);
  if (departmentId) filter.departmentId = departmentId;

  return { date: target, count: await Employee.countDocuments(filter) };
};

export const attrition = async ({ from, to, departmentId = null }) => {
  const departmentFilter = departmentId ? { departmentId } : {};
  const [exits, startHeadcount, endHeadcount] = await Promise.all([
    Employee.countDocuments({
      exitDate: { $gte: from, $lte: to },
      ...departmentFilter,
    }),
    Employee.countDocuments({ ...employedOnFilter(from), ...departmentFilter }),
    Employee.countDocuments({ ...employedOnFilter(to), ...departmentFilter }),
  ]);

  return {
    from,
    to,
    exits,
    startHeadcount,
    endHeadcount,
    rate: attritionRate(exits, startHeadcount, endHeadcount),
  };
};

const countsFor = (days) => {
  const counts = emptyAttendanceCounts();
  for (const day of days) {
    if (counts[day.status] !== undefined) counts[day.status] += 1;
  }
  return counts;
};

export const attendanceSummary = (range) => {
  const counts = emptyAttendanceCounts();

  for (const days of range.daysByEmployee.values()) {
    for (const day of days) {
      if (counts[day.status] !== undefined) counts[day.status] += 1;
    }
  }

  return {
    from: range.from,
    to: range.to,
    employees: range.employees.length,
    counts,
    expectedDays: expectedDaysOf(counts),
    attendanceRate: attendanceRateOf(counts),
    latePercent: latePercentOf(counts),
    absenteeism: absenteeismOf(counts),
  };
};

export const attendanceTrend = (range) => {
  const countsByDate = new Map();

  for (const days of range.daysByEmployee.values()) {
    for (const day of days) {
      if (day.status === "not_employed" || day.status === "future") continue;
      if (!countsByDate.has(day.date)) {
        countsByDate.set(day.date, emptyAttendanceCounts());
      }
      const counts = countsByDate.get(day.date);
      if (counts[day.status] !== undefined) counts[day.status] += 1;
    }
  }

  return [...countsByDate.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    // A day with no expected work (a weekend or holiday) has no rate to plot.
    .filter(([, counts]) => expectedDaysOf(counts) > 0)
    .map(([date, counts]) => ({ date, rate: attendanceRateOf(counts) }));
};

export const absenteeismByDepartment = (range) => {
  const groups = new Map();

  for (const employee of range.employees) {
    const key = employee.departmentId ? String(employee.departmentId) : "";
    if (!groups.has(key)) {
      groups.set(key, {
        departmentId: key || null,
        department: range.departmentNames.get(key) ?? "No department",
        counts: emptyAttendanceCounts(),
      });
    }

    const counts = groups.get(key).counts;
    for (const day of range.daysByEmployee.get(String(employee._id)) ?? []) {
      if (counts[day.status] !== undefined) counts[day.status] += 1;
    }
  }

  return [...groups.values()].map((group) => ({
    departmentId: group.departmentId,
    department: group.department,
    absentDays: group.counts.absent,
    expectedDays: expectedDaysOf(group.counts),
    absenteeism: absenteeismOf(group.counts),
    attendanceRate: attendanceRateOf(group.counts),
  }));
};

export const topLateComers = (range, limit = 5) => {
  const lateByEmployee = new Map();

  for (const [employeeId, days] of range.daysByEmployee.entries()) {
    const lateDays = days.filter((day) => day.status === "late").length;
    if (lateDays > 0) lateByEmployee.set(employeeId, lateDays);
  }

  return range.employees
    .map((employee) => ({
      employeeId: String(employee._id),
      code: employee.code,
      name: employee.name,
      department: range.departmentNames.get(String(employee.departmentId)) ?? null,
      lateDays: lateByEmployee.get(String(employee._id)) ?? 0,
    }))
    .filter((row) => row.lateDays > 0)
    .sort((first, second) => second.lateDays - first.lateDays || first.name.localeCompare(second.name))
    .slice(0, limit);
};

export const leaveSummary = async (range, { now: currentInstant = now() } = {}) => {
  const typeByCode = new Map(range.leaveTypes.map((type) => [type.code, type]));
  const daysByType = new Map();

  for (const leave of range.leaves) {
    if (leave.startDate < range.from || leave.startDate > range.to) continue;
    daysByType.set(
      leave.leaveTypeCode,
      (daysByType.get(leave.leaveTypeCode) ?? 0) + leave.days
    );
  }

  const byType = [...daysByType.entries()]
    .map(([code, days]) => ({
      code,
      name: typeByCode.get(code)?.name ?? code,
      isPaid: typeByCode.get(code)?.isPaid ?? true,
      days,
    }))
    .sort((first, second) => second.days - first.days);

  const headcountByDepartment = new Map();
  for (const employee of range.employees) {
    if (!isEmployedOn(employee, range.to)) continue;
    const key = employee.departmentId ? String(employee.departmentId) : "";
    headcountByDepartment.set(key, (headcountByDepartment.get(key) ?? 0) + 1);
  }

  const departmentByEmployee = new Map(
    range.employees.map((employee) => [
      String(employee._id),
      employee.departmentId ? String(employee.departmentId) : "",
    ])
  );
  const leavesStartingInRange = range.leaves.filter(
    (leave) => leave.startDate >= range.from && leave.startDate <= range.to
  );

  const utilization = [];
  for (const leaveType of range.leaveTypes) {
    for (const [departmentId, departmentHeadcount] of headcountByDepartment.entries()) {
      const days = leavesStartingInRange
        .filter(
          (leave) =>
            leave.leaveTypeCode === leaveType.code &&
            departmentByEmployee.get(String(leave.employeeId)) === departmentId
        )
        .reduce((total, leave) => total + leave.days, 0);

      utilization.push({
        typeCode: leaveType.code,
        typeName: leaveType.name,
        departmentId: departmentId || null,
        department: range.departmentNames.get(departmentId) ?? "No department",
        days,
        headcount: departmentHeadcount,
        utilization:
          leaveType.yearlyQuota === null ||
          departmentHeadcount === 0 ||
          leaveType.yearlyQuota === 0
            ? null
            : Math.round(
                ((days / (leaveType.yearlyQuota * departmentHeadcount)) * 100 + Number.EPSILON) *
                  100
              ) / 100,
      });
    }
  }

  const today = range.today ?? todayIn(range.settings?.timezone, currentInstant);
  const employeeById = new Map(
    range.employees.map((employee) => [String(employee._id), employee])
  );
  const todayLeaves = await LeaveRequest.find({
    status: "approved",
    startDate: { $lte: today },
    endDate: { $gte: today },
    employeeId: { $in: range.employees.map((employee) => employee._id) },
  }).lean();

  const onLeaveToday = todayLeaves.map((leave) => ({
    employeeId: String(leave.employeeId),
    code: employeeById.get(String(leave.employeeId))?.code ?? null,
    name: employeeById.get(String(leave.employeeId))?.name ?? null,
    leaveTypeCode: leave.leaveTypeCode,
    leaveTypeName: typeByCode.get(leave.leaveTypeCode)?.name ?? leave.leaveTypeCode,
  }));

  return { byType, utilization, onLeaveToday };
};

export const payrollCost = async ({ from, to, departmentId = null } = {}) => {
  const runFilter = { status: "finalized" };
  if (from || to) {
    runFilter.month = {};
    if (from) runFilter.month.$gte = from.slice(0, 7);
    if (to) runFilter.month.$lte = to.slice(0, 7);
  }

  const runs = await PayrollRun.find(runFilter).select("_id month").lean();
  const payslips = await Payslip.find({
    runId: { $in: runs.map((run) => run._id) },
  }).lean();

  const employeeIds = [...new Set(payslips.map((payslip) => String(payslip.employeeId)))];
  const employees = await Employee.find({ _id: { $in: employeeIds } })
    .select("departmentId")
    .lean();
  const departmentByEmployee = new Map(
    employees.map((employee) => [
      String(employee._id),
      employee.departmentId ? String(employee.departmentId) : "",
    ])
  );

  const monthByRun = new Map(runs.map((run) => [String(run._id), run.month]));
  const relevant = departmentId
    ? payslips.filter(
        (payslip) =>
          departmentByEmployee.get(String(payslip.employeeId)) === String(departmentId)
      )
    : payslips;

  const monthRows = new Map();
  const departmentRows = new Map();
  const { departmentNames } = await nameMaps();

  for (const payslip of relevant) {
    const month = monthByRun.get(String(payslip.runId)) ?? payslip.month;
    if (!monthRows.has(month)) {
      monthRows.set(month, { month, employees: 0, gross: 0, net: 0 });
    }
    const monthRow = monthRows.get(month);
    monthRow.employees += 1;
    monthRow.gross += payslip.gross;
    monthRow.net += payslip.netPay;

    const key = departmentByEmployee.get(String(payslip.employeeId)) ?? "";
    if (!departmentRows.has(key)) {
      departmentRows.set(key, {
        departmentId: key || null,
        department: departmentNames.get(key) ?? "No department",
        employees: 0,
        gross: 0,
        net: 0,
      });
    }
    const departmentRow = departmentRows.get(key);
    departmentRow.employees += 1;
    departmentRow.gross += payslip.gross;
    departmentRow.net += payslip.netPay;
  }

  return {
    byMonth: [...monthRows.values()]
      .sort((first, second) => first.month.localeCompare(second.month))
      .map((row) => ({ ...row, gross: round2(row.gross), net: round2(row.net) })),
    byDepartment: [...departmentRows.values()]
      .sort((first, second) => second.net - first.net)
      .map((row) => ({ ...row, gross: round2(row.gross), net: round2(row.net) })),
  };
};

export const averageSalary = async ({ departmentId = null } = {}) => {
  const filter = { status: { $in: ["probation", "active"] } };
  if (departmentId) filter.departmentId = departmentId;

  const employees = await Employee.find(filter).lean();
  const { departmentNames, designationNames } = await nameMaps();

  const collect = (keyOf, names) => {
    const groups = new Map();

    for (const employee of employees) {
      const key = keyOf(employee);
      if (!groups.has(key)) {
        groups.set(key, { id: key || null, name: names.get(key) ?? "Not set", salaries: [] });
      }
      groups
        .get(key)
        .salaries.push(
          grossOf(employee.basicSalary, employee.hraPercent, employee.medicalPercent)
        );
    }

    return [...groups.values()]
      .map((group) => ({
        departmentId: group.id,
        department: group.name,
        headcount: group.salaries.length,
        averageGross: meanOf(group.salaries),
      }))
      .sort((first, second) => second.averageGross - first.averageGross);
  };

  const byDepartment = collect(
    (employee) => (employee.departmentId ? String(employee.departmentId) : ""),
    departmentNames
  ).map((row) => ({
    departmentId: row.departmentId,
    department: row.department,
    headcount: row.headcount,
    averageGross: row.averageGross,
  }));

  const byDesignation = collect(
    (employee) => (employee.designationId ? String(employee.designationId) : ""),
    designationNames
  ).map((row) => ({
    designationId: row.departmentId,
    designation: row.department,
    headcount: row.headcount,
    averageGross: row.averageGross,
  }));

  return { byDepartment, byDesignation };
};

export const headcountByDepartment = (range) => {
  const groups = new Map();

  for (const employee of range.employees) {
    if (!isEmployedOn(employee, range.to)) continue;
    const key = employee.departmentId ? String(employee.departmentId) : "";
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  return [...groups.entries()]
    .map(([departmentId, count]) => ({
      departmentId: departmentId || null,
      department: range.departmentNames.get(departmentId) ?? "No department",
      count,
    }))
    .sort((first, second) => second.count - first.count);
};

export const genderSplit = (range) => {
  const counts = new Map();

  for (const employee of range.employees) {
    if (!isEmployedOn(employee, range.to)) continue;
    const key = employee.gender ?? "not_set";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].map(([gender, count]) => ({ gender, count }));
};

export const tenureBuckets = (range) => {
  const buckets = { underOneYear: 0, oneToThreeYears: 0, overThreeYears: 0 };

  for (const employee of range.employees) {
    if (!isEmployedOn(employee, range.to)) continue;
    const bucket = tenureBucketOf(employee.joinDate, range.to);
    if (bucket === "under_1") buckets.underOneYear += 1;
    else if (bucket === "one_to_three") buckets.oneToThreeYears += 1;
    else buckets.overThreeYears += 1;
  }

  return buckets;
};

export const pendingApprovals = async () => {
  const [leave, corrections] = await Promise.all([
    LeaveRequest.countDocuments({ status: "pending" }),
    AttendanceCorrection.countDocuments({ status: "pending" }),
  ]);

  return { leave, corrections };
};

const openMinutesOf = (record, currentInstant) => {
  if (!record.checkIn || record.checkOut) return 0;
  return Math.max(
    0,
    Math.round((currentInstant.getTime() - new Date(record.checkIn).getTime()) / 60000)
  );
};

export const personalMetrics = async (
  employeeId,
  { now: currentInstant = now() } = {}
) => {
  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);
  const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7));
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = `${today.slice(0, 7)}-31`;

  const [weekRecords, lateCount, finalizedRuns] = await Promise.all([
    Attendance.find({
      employeeId,
      date: { $gte: weekStart, $lte: today },
    }).lean(),
    Attendance.countDocuments({
      employeeId,
      status: "late",
      date: { $gte: monthStart, $lte: monthEnd },
    }),
    PayrollRun.find({ status: "finalized" }).select("_id").lean(),
  ]);

  const payslip = await Payslip.findOne({
    employeeId,
    runId: { $in: finalizedRuns.map((run) => run._id) },
  }).sort({ month: -1 });

  const workedMinutes = weekRecords.reduce(
    (total, record) =>
      total + (record.workedMinutes || openMinutesOf(record, currentInstant)),
    0
  );

  return {
    hoursThisWeek: Math.round((workedMinutes / 60) * 100) / 100,
    weeklyHours: settings?.weeklyHours ?? 40,
    lateCount,
    lastPayslip: payslip,
    weekStart,
  };
};

export const searchEmployees = async ({ query, departmentId = null, limit = 10 }) => {
  const filter = {};
  if (departmentId) filter.departmentId = departmentId;
  if (query) {
    const pattern = new RegExp(escapeRegex(query), "i");
    filter.$or = [{ name: pattern }, { code: pattern }, { email: pattern }];
  }

  const employees = await Employee.find(filter)
    .sort({ name: 1 })
    .limit(Math.min(Math.max(Number(limit) || 10, 1), 25))
    .lean();
  const { departmentNames, designationNames } = await nameMaps();

  return employees.map((employee) => ({
    name: employee.name,
    code: employee.code,
    department: departmentNames.get(String(employee.departmentId)) ?? null,
    designation: designationNames.get(String(employee.designationId)) ?? null,
    status: employee.status,
  }));
};
