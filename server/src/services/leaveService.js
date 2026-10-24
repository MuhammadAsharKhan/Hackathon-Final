import Employee from "../models/Employee.js";
import LeaveRequest from "../models/LeaveRequest.js";
import LeaveType from "../models/LeaveType.js";
import ApiError from "../utils/ApiError.js";
import { now } from "../utils/clock.js";
import { todayIn } from "../utils/dates.js";
import { assertCanDecide, loadDecisionSubject } from "./approvalService.js";
import { log } from "./auditService.js";
import { findOwnEmployee } from "./attendanceService.js";
import { getCalendar } from "./calendarService.js";
import {
  availableToRequest,
  countLeaveDays,
  exceedsQuota,
  remainingDays,
} from "./leaveCalc.js";
import { notify, notifyApprovers } from "./notificationService.js";
import { getSettings } from "./settingsService.js";

const yearRange = (year) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
});

const currentYear = async (currentInstant) => {
  const settings = await getSettings();
  return Number(todayIn(settings?.timezone, currentInstant).slice(0, 4));
};

const loadYearTotals = async (employeeId, year, excludeRequestId) => {
  const { start, end } = yearRange(year);
  const requests = await LeaveRequest.find({
    employeeId,
    status: { $in: ["approved", "pending"] },
    startDate: { $gte: start, $lte: end },
  })
    .select("leaveTypeCode days status")
    .lean();

  const used = new Map();
  const pending = new Map();

  for (const request of requests) {
    if (excludeRequestId && String(request._id) === String(excludeRequestId)) continue;

    const totals = request.status === "approved" ? used : pending;
    totals.set(
      request.leaveTypeCode,
      (totals.get(request.leaveTypeCode) ?? 0) + request.days
    );
  }

  return { used, pending };
};

const evaluateRequest = async ({
  employee,
  leaveTypeCode,
  startDate,
  endDate,
  excludeRequestId,
}) => {
  const leaveType = await LeaveType.findOne({ code: leaveTypeCode }).lean();
  if (!leaveType) {
    return { ok: false, reason: "Unknown leave type", days: 0, remaining: null };
  }

  if (endDate < startDate) {
    return { ok: false, reason: "End date is before start date", days: 0, remaining: null };
  }
  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) {
    return {
      ok: false,
      reason: "Leave must start and end in the same calendar year",
      days: 0,
      remaining: null,
    };
  }

  const { settings, holidaySet } = await getCalendar(startDate, endDate);
  const days = countLeaveDays(startDate, endDate, settings, holidaySet);
  const year = Number(startDate.slice(0, 4));
  const totals = await loadYearTotals(employee.id, year, excludeRequestId);
  const used = totals.used.get(leaveType.code) ?? 0;
  const pending = totals.pending.get(leaveType.code) ?? 0;
  const quota = leaveType.yearlyQuota ?? null;

  if (days === 0) {
    return {
      ok: false,
      reason: "These dates contain no working days",
      days,
      remaining: remainingDays(quota, used, pending),
    };
  }

  const overlapFilter = {
    employeeId: employee.id,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (excludeRequestId) overlapFilter._id = { $ne: excludeRequestId };

  const overlapping = await LeaveRequest.exists(overlapFilter);
  if (overlapping) {
    return {
      ok: false,
      reason: "These dates overlap another leave request",
      days,
      remaining: remainingDays(quota, used, pending),
    };
  }

  if (exceedsQuota(quota, used, pending, days)) {
    return {
      ok: false,
      reason: `Only ${availableToRequest(quota, used, pending)} day(s) left for ${leaveType.name}`,
      days,
      remaining: remainingDays(quota, used, pending),
    };
  }

  const remaining = remainingDays(quota, used, pending);

  return {
    ok: true,
    leaveType,
    days,
    remaining: remaining === null ? null : remaining - days,
  };
};

export const getBalancesForEmployee = async (employeeId, year, currentInstant = now()) => {
  const targetYear = year ?? (await currentYear(currentInstant));
  const [leaveTypes, totals] = await Promise.all([
    LeaveType.find().sort({ code: 1 }).lean(),
    loadYearTotals(employeeId, targetYear),
  ]);

  const balances = leaveTypes.map((leaveType) => {
    const used = totals.used.get(leaveType.code) ?? 0;
    const pending = totals.pending.get(leaveType.code) ?? 0;
    const quota = leaveType.yearlyQuota ?? null;

    return {
      code: leaveType.code,
      name: leaveType.name,
      isPaid: leaveType.isPaid,
      quota,
      used,
      pending,
      remaining: remainingDays(quota, used, pending),
    };
  });

  return { year: targetYear, balances };
};

export const getBalance = async (actor, year, currentInstant = now()) => {
  const employee = await findOwnEmployee(actor.id);
  return getBalancesForEmployee(employee.id, year, currentInstant);
};

export const previewLeave = async (actor, payload) => {
  const employee = await findOwnEmployee(actor.id);
  const result = await evaluateRequest({
    employee,
    leaveTypeCode: payload.leaveTypeCode,
    startDate: payload.startDate,
    endDate: payload.endDate,
  });

  return {
    valid: result.ok,
    days: result.days,
    reason: result.ok ? null : result.reason,
    remaining: result.remaining,
  };
};

export const applyLeave = async (actor, payload) => {
  const employee = await findOwnEmployee(actor.id);
  const result = await evaluateRequest({
    employee,
    leaveTypeCode: payload.leaveTypeCode,
    startDate: payload.startDate,
    endDate: payload.endDate,
  });

  if (!result.ok) throw new ApiError(422, result.reason);

  const request = await LeaveRequest.create({
    employeeId: employee.id,
    leaveTypeCode: result.leaveType.code,
    startDate: payload.startDate,
    endDate: payload.endDate,
    days: result.days,
    reason: payload.reason,
  });

  await notifyApprovers({
    requesterUserId: actor.id,
    requesterRole: actor.role,
    type: "leave",
    title: "Leave request submitted",
    message: `${employee.name} requested ${result.days} day(s) of ${result.leaveType.name} from ${payload.startDate} to ${payload.endDate}`,
    link: "/leave/requests",
  });

  return request;
};

const leaveSnapshot = (request) => ({
  status: request.status,
  leaveTypeCode: request.leaveTypeCode,
  startDate: request.startDate,
  endDate: request.endDate,
  days: request.days,
});

const findLeaveRequest = async (requestId) => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Leave request not found");
  return request;
};

export const cancelLeave = async (
  actor,
  requestId,
  { now: currentInstant = now() } = {}
) => {
  const request = await findLeaveRequest(requestId);

  if (!actor.employeeId || String(request.employeeId) !== String(actor.employeeId)) {
    throw new ApiError(403, "You can only cancel your own leave request");
  }

  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);
  const canCancel =
    request.status === "pending" ||
    (request.status === "approved" && request.startDate > today);

  if (!canCancel) {
    throw new ApiError(
      422,
      "Only a pending request, or an approved request that starts later, can be cancelled"
    );
  }

  const before = leaveSnapshot(request);
  request.status = "cancelled";
  await request.save();

  await log(actor, "leave.cancel", "leaveRequest", request.id, before, leaveSnapshot(request));

  return request;
};

export const decideLeave = async (
  actor,
  requestId,
  { decision, comment },
  { now: currentInstant = now() } = {}
) => {
  const request = await findLeaveRequest(requestId);

  if (request.status !== "pending") {
    throw new ApiError(409, "This leave request has already been decided");
  }
  if (decision === "reject" && !comment) {
    throw new ApiError(422, "A comment is required to reject a leave request");
  }

  const { employee, employeeRole } = await loadDecisionSubject(request.employeeId);
  assertCanDecide(actor, employee, employeeRole);

  const before = leaveSnapshot(request);

  if (decision === "approve") {
    const result = await evaluateRequest({
      employee,
      leaveTypeCode: request.leaveTypeCode,
      startDate: request.startDate,
      endDate: request.endDate,
      excludeRequestId: request.id,
    });

    if (!result.ok) throw new ApiError(422, result.reason);
    request.days = result.days;
  }

  request.status = decision === "approve" ? "approved" : "rejected";
  request.decidedBy = actor.id;
  request.decisionComment = comment ?? "";
  request.decidedAt = currentInstant;
  await request.save();

  await log(actor, "leave.decision", "leaveRequest", request.id, before, leaveSnapshot(request));

  if (employee.userId) {
    await notify({
      userId: employee.userId,
      type: "leave",
      title: decision === "approve" ? "Leave approved" : "Leave rejected",
      message:
        decision === "approve"
          ? `Your leave from ${request.startDate} to ${request.endDate} was approved`
          : `Your leave from ${request.startDate} to ${request.endDate} was rejected${comment ? `: ${comment}` : ""}`,
      link: "/me/leave",
    });
  }

  return request;
};

export const listLeaveRequests = async (actor, query) => {
  const filter = {};

  if (actor.role === "employee") {
    if (!actor.employeeId) throw new ApiError(403, "This account has no employee record");
    filter.employeeId = actor.employeeId;
  } else if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }

  if (query.status) filter.status = query.status;
  if (query.from) filter.endDate = { $gte: query.from };
  if (query.to) filter.startDate = { $lte: query.to };

  const [requests, total] = await Promise.all([
    LeaveRequest.find(filter)
      .sort({ startDate: -1, createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    LeaveRequest.countDocuments(filter),
  ]);

  const employeeIds = [...new Set(requests.map((request) => String(request.employeeId)))];
  const [employees, leaveTypes] = await Promise.all([
    Employee.find({ _id: { $in: employeeIds } }).select("name code").lean(),
    LeaveType.find().select("code name").lean(),
  ]);

  const employeeNames = new Map(
    employees.map((employee) => [String(employee._id), employee])
  );
  const typeNames = new Map(leaveTypes.map((type) => [type.code, type.name]));

  const rows = requests.map((request) => {
    const employee = employeeNames.get(String(request.employeeId));
    return {
      ...request,
      id: String(request._id),
      employeeName: employee?.name ?? null,
      employeeCode: employee?.code ?? null,
      leaveTypeName: typeNames.get(request.leaveTypeCode) ?? request.leaveTypeCode,
    };
  });

  return {
    requests: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getRecentLeaves = async (employeeId, limit = 5) =>
  LeaveRequest.find({ employeeId })
    .sort({ startDate: -1 })
    .limit(limit)
    .lean();
