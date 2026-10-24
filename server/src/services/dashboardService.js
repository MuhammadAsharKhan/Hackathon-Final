import Announcement from "../models/Announcement.js";
import AuditLog from "../models/AuditLog.js";
import Department from "../models/Department.js";
import ApiError from "../utils/ApiError.js";
import { now } from "../utils/clock.js";
import { todayIn } from "../utils/dates.js";
import {
  absenteeismByDepartment,
  attendanceTrend,
  attrition,
  averageSalary,
  genderSplit,
  headcount,
  headcountByDepartment,
  leaveSummary,
  loadAnalyticsRange,
  payrollCost,
  pendingApprovals,
  personalMetrics,
  tenureBuckets,
  topLateComers,
} from "./analyticsService.js";
import { getEmployeeDaysForRange, findOwnEmployee, getTodayView } from "./attendanceService.js";
import { getBalancesForEmployee } from "./leaveService.js";
import { getSettings } from "./settingsService.js";

const resolveFilters = async (query, currentInstant) => {
  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);

  const from = query.from ?? `${today.slice(0, 7)}-01`;
  const to = query.to ?? today;

  if (from > to) throw new ApiError(400, "from must not be after to");

  if (query.department) {
    const departmentExists = await Department.exists({ _id: query.department });
    if (!departmentExists) throw new ApiError(400, "Unknown department");
  }

  return {
    from,
    to,
    departmentId: query.department ?? null,
    today,
    settings,
  };
};

const filtersPayload = (filters) => ({
  from: filters.from,
  to: filters.to,
  department: filters.departmentId,
});

const countOnDate = (range, date) => {
  const counts = { present: 0, late: 0, absent: 0, onLeave: 0 };

  for (const days of range.daysByEmployee.values()) {
    const entry = days.find((day) => day.date === date);
    if (!entry) continue;
    if (entry.status === "present") counts.present += 1;
    else if (entry.status === "late") counts.late += 1;
    else if (entry.status === "on_leave") counts.onLeave += 1;
    else if (entry.status === "absent") counts.absent += 1;
  }

  return counts;
};

const todayCounts = async (range, currentInstant) => {
  if (range.from <= range.today && range.today <= range.to) {
    return countOnDate(range, range.today);
  }

  const daysByEmployee = await getEmployeeDaysForRange(
    range.employees.map((employee) => String(employee._id)),
    range.today,
    range.today,
    { now: currentInstant }
  );

  return countOnDate(
    { daysByEmployee, today: range.today },
    range.today
  );
};

export const buildAdminDashboard = async (
  query,
  { now: currentInstant = now() } = {}
) => {
  const filters = await resolveFilters(query, currentInstant);
  const range = await loadAnalyticsRange({ ...filters, now: currentInstant });
  const yearStart = `${filters.today.slice(0, 4)}-01-01`;

  const [headcountValue, attritionYtd, payroll, salaries, auditFeed] =
    await Promise.all([
      headcount({ date: filters.to, departmentId: filters.departmentId }),
      attrition({
        from: yearStart,
        to: filters.today,
        departmentId: filters.departmentId,
      }),
      payrollCost({
        from: filters.from,
        to: filters.to,
        departmentId: filters.departmentId,
      }),
      averageSalary({ departmentId: filters.departmentId }),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

  return {
    filters: filtersPayload(filters),
    headcount: headcountValue,
    attritionYtd,
    payrollCost: payroll,
    averageSalary: salaries,
    headcountByDepartment: headcountByDepartment(range),
    gender: genderSplit(range),
    tenure: tenureBuckets(range),
    auditFeed,
  };
};

export const buildHrDashboard = async (
  query,
  { now: currentInstant = now() } = {}
) => {
  const filters = await resolveFilters(query, currentInstant);
  const range = await loadAnalyticsRange({ ...filters, now: currentInstant });

  const [todayTotals, leave, approvals] = await Promise.all([
    todayCounts(range, currentInstant),
    leaveSummary(range, { now: currentInstant }),
    pendingApprovals(),
  ]);

  const hiredToday = await headcount({
    date: filters.to,
    departmentId: filters.departmentId,
  });

  return {
    filters: filtersPayload(filters),
    headcount: hiredToday.count,
    presentToday: todayTotals.present,
    onLeaveToday: leave.onLeaveToday.length,
    lateToday: todayTotals.late,
    pendingApprovals: approvals,
    attendanceTrend: attendanceTrend(range),
    absenteeismByDepartment: absenteeismByDepartment(range),
    leaveByType: leave.byType,
    topLateComers: topLateComers(range, 5),
    leaveUtilization: leave.utilization,
  };
};

export const buildMyDashboard = async (
  actor,
  { now: currentInstant = now() } = {}
) => {
  const employee = await findOwnEmployee(actor.id);
  const employeeId = String(employee._id);

  const [todayView, metrics, balances, announcements] = await Promise.all([
    getTodayView(actor, { now: currentInstant }),
    personalMetrics(employeeId, { now: currentInstant }),
    getBalancesForEmployee(employeeId, undefined, currentInstant),
    Announcement.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    today: {
      date: todayView.date,
      status: todayView.status,
      record: todayView.record ?? null,
      canCheckIn: todayView.canCheckIn,
      canCheckOut: todayView.canCheckOut,
    },
    hoursThisWeek: metrics.hoursThisWeek,
    weeklyHours: metrics.weeklyHours,
    lateCount: metrics.lateCount,
    leaveBalances: balances.balances,
    lastPayslip: metrics.lastPayslip,
    announcements,
  };
};
