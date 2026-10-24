import Attendance from "../models/Attendance.js";
import AttendanceCorrection from "../models/AttendanceCorrection.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import LeaveRequest from "../models/LeaveRequest.js";
import LeaveType from "../models/LeaveType.js";
import ApiError from "../utils/ApiError.js";
import { now } from "../utils/clock.js";
import { eachDay, monthBounds, todayIn, zonedToUtc } from "../utils/dates.js";
import { distanceMeters } from "../utils/haversine.js";
import { round2 } from "../utils/money.js";
import { assertCanDecide, loadDecisionSubject } from "./approvalService.js";
import {
  buildEmployeeDays,
  computeCheckInStatus,
  computeCheckOutStatus,
  evaluateCameraLocation,
  summarizeEmployeeDays,
} from "./attendanceCalc.js";
import { log } from "./auditService.js";
import { getCalendar } from "./calendarService.js";
import { notify, notifyApprovers } from "./notificationService.js";
import { getSettings } from "./settingsService.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const officeIsSet = (settings) =>
  settings?.officeLat !== null &&
  settings?.officeLat !== undefined &&
  settings?.officeLng !== null &&
  settings?.officeLng !== undefined;

export const findEmployeeOrThrow = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new ApiError(404, "Employee not found");
  return employee;
};

export const findOwnEmployee = async (userId) => {
  const employee = await Employee.findOne({ userId });
  if (!employee) throw new ApiError(403, "This account has no employee record");
  return employee;
};

const approvedLeaveDatesFor = async (employeeId, from, to) => {
  const requests = await LeaveRequest.find({
    employeeId,
    status: "approved",
    startDate: { $lte: to },
    endDate: { $gte: from },
  })
    .select("startDate endDate")
    .lean();

  const dates = new Set();
  for (const request of requests) {
    const start = request.startDate > from ? request.startDate : from;
    const end = request.endDate < to ? request.endDate : to;
    for (const day of eachDay(start, end)) dates.add(day);
  }

  return dates;
};

const recordsByDateFor = async (employeeId, from, to) => {
  const records = await Attendance.find({
    employeeId,
    date: { $gte: from, $lte: to },
  }).lean();

  return new Map(records.map((record) => [record.date, record]));
};

const daysForEmployee = async (employee, from, to, currentInstant) => {
  const { settings, holidaySet } = await getCalendar(from, to);
  const [records, approvedLeaveDates] = await Promise.all([
    recordsByDateFor(employee.id, from, to),
    approvedLeaveDatesFor(employee.id, from, to),
  ]);

  return buildEmployeeDays({
    employee,
    from,
    to,
    settings,
    holidaySet,
    records,
    approvedLeaveDates,
    today: todayIn(settings?.timezone, currentInstant),
  });
};

// The shared reader for payroll and dashboards. Five queries whatever the
// number of employees: settings, holidays, employees, records and leaves.
// Returns Map<employeeId, day entries>.
export const getEmployeeDaysForRange = async (
  employeeIds,
  from,
  to,
  { now: currentInstant = now() } = {}
) => {
  const ids = [...new Set((employeeIds ?? []).map(String))];
  const daysByEmployee = new Map();
  if (ids.length === 0) return daysByEmployee;

  const { settings, holidaySet } = await getCalendar(from, to);
  const [employees, records, leaves, leaveTypes] = await Promise.all([
    Employee.find({ _id: { $in: ids } }).lean(),
    Attendance.find({
      employeeId: { $in: ids },
      date: { $gte: from, $lte: to },
    }).lean(),
    LeaveRequest.find({
      employeeId: { $in: ids },
      status: "approved",
      startDate: { $lte: to },
      endDate: { $gte: from },
    })
      .select("employeeId leaveTypeCode startDate endDate")
      .lean(),
    LeaveType.find().select("code isPaid").lean(),
  ]);

  const paidByType = new Map(
    leaveTypes.map((leaveType) => [leaveType.code, leaveType.isPaid])
  );

  const today = todayIn(settings?.timezone, currentInstant);

  const recordsByEmployee = new Map();
  for (const record of records) {
    const key = String(record.employeeId);
    if (!recordsByEmployee.has(key)) recordsByEmployee.set(key, new Map());
    recordsByEmployee.get(key).set(record.date, record);
  }

  const leaveDatesByEmployee = new Map();
  for (const leave of leaves) {
    const key = String(leave.employeeId);
    if (!leaveDatesByEmployee.has(key)) leaveDatesByEmployee.set(key, new Map());

    const start = leave.startDate > from ? leave.startDate : from;
    const end = leave.endDate < to ? leave.endDate : to;
    const leaveInfo = {
      leaveTypeCode: leave.leaveTypeCode,
      leavePaid: paidByType.get(leave.leaveTypeCode) ?? null,
    };
    for (const day of eachDay(start, end)) {
      leaveDatesByEmployee.get(key).set(day, leaveInfo);
    }
  }

  for (const employee of employees) {
    const key = String(employee._id);
    daysByEmployee.set(
      key,
      buildEmployeeDays({
        employee,
        from,
        to,
        settings,
        holidaySet,
        records: recordsByEmployee.get(key) ?? new Map(),
        approvedLeaveDates: leaveDatesByEmployee.get(key) ?? new Map(),
        today,
      })
    );
  }

  return daysByEmployee;
};

export const getTodayView = async (actor, { now: currentInstant = now() } = {}) => {
  const employee = await findOwnEmployee(actor.id);
  const settings = await getSettings();
  const date = todayIn(settings?.timezone, currentInstant);
  const [entry] = await daysForEmployee(employee, date, date, currentInstant);
  const record = entry.record ?? null;

  return {
    date,
    record,
    status: entry.status,
    canCheckIn: !record && entry.status !== "on_leave",
    canCheckOut: Boolean(record && record.checkIn && !record.checkOut),
  };
};

const readLocation = (settings, payload) => {
  if (payload.lat === undefined || payload.lng === undefined) return null;

  return {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy ?? null,
    distanceMeters: officeIsSet(settings)
      ? round2(
          distanceMeters(settings.officeLat, settings.officeLng, payload.lat, payload.lng)
        )
      : null,
  };
};

const assertSourceAllowsLocation = (settings, payload) => {
  if ((payload.source ?? "web") !== "camera") return;

  const verdict = evaluateCameraLocation({
    settings,
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    faceCount: payload.faceCount,
  });

  if (!verdict.allowed) throw new ApiError(422, verdict.reason);
};

export const checkIn = async (
  actor,
  payload,
  { now: currentInstant = now() } = {}
) => {
  const employee = await findOwnEmployee(actor.id);
  const settings = await getSettings();
  const date = todayIn(settings?.timezone, currentInstant);

  const existing = await Attendance.findOne({ employeeId: employee.id, date });
  if (existing) throw new ApiError(409, "You already checked in today");

  const leaveDates = await approvedLeaveDatesFor(employee.id, date, date);
  if (leaveDates.has(date)) {
    throw new ApiError(422, "Approved leave covers today, so check-in is not allowed");
  }

  assertSourceAllowsLocation(settings, payload);

  return Attendance.create({
    employeeId: employee.id,
    date,
    checkIn: currentInstant,
    source: payload.source ?? "web",
    status: computeCheckInStatus(currentInstant, settings),
    workedMinutes: 0,
    location: readLocation(settings, payload),
    faceCount: payload.faceCount ?? null,
  });
};

export const checkOut = async (
  actor,
  payload,
  { now: currentInstant = now() } = {}
) => {
  const employee = await findOwnEmployee(actor.id);
  const settings = await getSettings();
  const date = todayIn(settings?.timezone, currentInstant);

  const record = await Attendance.findOne({ employeeId: employee.id, date });
  if (!record) throw new ApiError(422, "Check in before checking out");
  if (record.checkOut) throw new ApiError(409, "You already checked out today");

  if (payload.source === "camera") {
    assertSourceAllowsLocation(settings, payload);
  }

  const { workedMinutes, status } = computeCheckOutStatus(
    record,
    currentInstant,
    settings
  );

  record.checkOut = currentInstant;
  record.workedMinutes = workedMinutes;
  record.status = status;

  const location = readLocation(settings, payload);
  if (location) record.location = location;

  await record.save();
  return record;
};

const monthValueFor = async (month, currentInstant) => {
  if (month) return month;
  const settings = await getSettings();
  return todayIn(settings?.timezone, currentInstant).slice(0, 7);
};

const monthView = async (employee, month, currentInstant) => {
  const monthValue = await monthValueFor(month, currentInstant);
  const { start, end } = monthBounds(monthValue);
  const days = await daysForEmployee(employee, start, end, currentInstant);

  return {
    month: monthValue,
    days,
    summary: summarizeEmployeeDays(days),
  };
};

export const getMyMonth = async (
  actor,
  month,
  { now: currentInstant = now() } = {}
) => monthView(await findOwnEmployee(actor.id), month, currentInstant);

export const getEmployeeMonth = async (
  employeeId,
  month,
  { now: currentInstant = now() } = {}
) => monthView(await findEmployeeOrThrow(employeeId), month, currentInstant);

const nameMap = async (model) => {
  const documents = await model.find().select("name").lean();
  return new Map(documents.map((document) => [String(document._id), document.name]));
};

export const getBoard = async (query, { now: currentInstant = now() } = {}) => {
  const settings = await getSettings();
  const boardDate = query.date ?? todayIn(settings?.timezone, currentInstant);

  const filter = {
    status: { $in: ["probation", "active"] },
    joinDate: { $lte: boardDate },
    $and: [{ $or: [{ exitDate: null }, { exitDate: { $gte: boardDate } }] }],
  };

  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$and.push({
      $or: [{ name: pattern }, { code: pattern }, { email: pattern }],
    });
  }

  const employees = await Employee.find(filter).sort({ name: 1 }).lean();
  const [daysByEmployee, departmentNames, designationNames] = await Promise.all([
    getEmployeeDaysForRange(
      employees.map((employee) => String(employee._id)),
      boardDate,
      boardDate,
      { now: currentInstant }
    ),
    nameMap(Department),
    nameMap(Designation),
  ]);

  const rows = employees.map((employee) => {
    const entry = daysByEmployee.get(String(employee._id))?.[0];
    return {
      employeeId: String(employee._id),
      code: employee.code,
      name: employee.name,
      department: departmentNames.get(String(employee.departmentId)) ?? null,
      designation: designationNames.get(String(employee.designationId)) ?? null,
      date: boardDate,
      status: entry?.status ?? "absent",
      checkIn: entry?.record?.checkIn ?? null,
      checkOut: entry?.record?.checkOut ?? null,
      workedMinutes: entry?.record?.workedMinutes ?? 0,
    };
  });

  const filtered = query.status
    ? rows.filter((row) => row.status === query.status)
    : rows;
  const offset = (query.page - 1) * query.limit;

  return {
    date: boardDate,
    rows: filtered.slice(offset, offset + query.limit),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: filtered.length,
      pages: Math.ceil(filtered.length / query.limit),
    },
  };
};

export const createCorrection = async (
  actor,
  payload,
  { now: currentInstant = now() } = {}
) => {
  const employee = await findOwnEmployee(actor.id);
  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);

  if (payload.date > today) {
    throw new ApiError(422, "A correction is only for today or a past date");
  }
  if (employee.joinDate && payload.date < employee.joinDate) {
    throw new ApiError(422, "This date is before the joining date");
  }
  if (employee.exitDate && payload.date > employee.exitDate) {
    throw new ApiError(422, "This date is after the exit date");
  }

  const pendingExists = await AttendanceCorrection.exists({
    employeeId: employee.id,
    date: payload.date,
    status: "pending",
  });
  if (pendingExists) {
    throw new ApiError(409, "A pending correction already exists for this date");
  }

  const correction = await AttendanceCorrection.create({
    employeeId: employee.id,
    date: payload.date,
    requestedCheckIn: payload.requestedCheckIn ?? null,
    requestedCheckOut: payload.requestedCheckOut ?? null,
    reason: payload.reason,
  });

  await notifyApprovers({
    requesterUserId: actor.id,
    requesterRole: actor.role,
    type: "attendance",
    title: "Attendance correction requested",
    message: `${employee.name} asked to correct attendance for ${payload.date}`,
    link: "/attendance",
  });

  return correction;
};

export const listCorrections = async (actor, query) => {
  const filter = {};

  if (actor.role === "employee") {
    if (!actor.employeeId) throw new ApiError(403, "This account has no employee record");
    filter.employeeId = actor.employeeId;
  }
  if (query.status) filter.status = query.status;

  const [corrections, total] = await Promise.all([
    AttendanceCorrection.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    AttendanceCorrection.countDocuments(filter),
  ]);

  const employees = await Employee.find({
    _id: { $in: corrections.map((correction) => correction.employeeId) },
  })
    .select("name code")
    .lean();
  const employeeNames = new Map(
    employees.map((employee) => [String(employee._id), employee])
  );

  const rows = corrections.map((correction) => {
    const employee = employeeNames.get(String(correction.employeeId));
    return {
      ...correction,
      id: String(correction._id),
      employeeName: employee?.name ?? null,
      employeeCode: employee?.code ?? null,
    };
  });

  return {
    corrections: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

const existingSnapshot = (correction) => ({
  status: correction.status,
  requestedCheckIn: correction.requestedCheckIn,
  requestedCheckOut: correction.requestedCheckOut,
  date: correction.date,
});

const buildCorrectedTimes = ({ existingRecord, correction, settings }) => {
  const timezone = settings?.timezone;

  const checkIn = correction.requestedCheckIn
    ? zonedToUtc(correction.date, correction.requestedCheckIn, timezone)
    : existingRecord?.checkIn ?? null;

  const checkOut = correction.requestedCheckOut
    ? zonedToUtc(correction.date, correction.requestedCheckOut, timezone)
    : existingRecord?.checkOut ?? null;

  if (!checkIn) {
    throw new ApiError(422, "A check-in time is required when there is no attendance record");
  }
  if (checkOut && checkOut <= checkIn) {
    throw new ApiError(422, "Check-out must be after check-in");
  }

  return { checkIn, checkOut };
};

const writeCorrectionRecord = async ({ employee, correction, settings }) => {
  const existingRecord = await Attendance.findOne({
    employeeId: employee.id,
    date: correction.date,
  });

  if (!existingRecord && (!correction.requestedCheckIn || !correction.requestedCheckOut)) {
    throw new ApiError(
      422,
      "Both times are required because there is no attendance record for this date"
    );
  }

  const { checkIn, checkOut } = buildCorrectedTimes({
    existingRecord,
    correction,
    settings,
  });

  const arrivalStatus = computeCheckInStatus(checkIn, settings);
  const { workedMinutes, status } = checkOut
    ? computeCheckOutStatus({ checkIn, status: arrivalStatus }, checkOut, settings)
    : { workedMinutes: 0, status: arrivalStatus };

  return Attendance.findOneAndUpdate(
    { employeeId: employee.id, date: correction.date },
    {
      $set: {
        checkIn,
        checkOut,
        status,
        workedMinutes,
        source: "correction",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export const decideCorrection = async (
  actor,
  correctionId,
  { decision, comment },
  { now: currentInstant = now() } = {}
) => {
  const correction = await AttendanceCorrection.findById(correctionId);
  if (!correction) throw new ApiError(404, "Correction not found");
  if (correction.status !== "pending") {
    throw new ApiError(409, "This correction has already been decided");
  }
  if (decision === "reject" && !comment) {
    throw new ApiError(422, "A comment is required to reject a correction");
  }

  const { employee, employeeRole } = await loadDecisionSubject(correction.employeeId);
  assertCanDecide(actor, employee, employeeRole);

  const before = existingSnapshot(correction);
  const settings = await getSettings();
  let record = null;

  if (decision === "approve") {
    record = await writeCorrectionRecord({ employee, correction, settings });
  }

  correction.status = decision === "approve" ? "approved" : "rejected";
  correction.decidedBy = actor.id;
  correction.decisionComment = comment ?? "";
  correction.decidedAt = currentInstant;
  await correction.save();

  await log(
    actor,
    "attendance.correctionDecision",
    "attendanceCorrection",
    correction.id,
    before,
    { ...existingSnapshot(correction), record: record?.id ?? null }
  );

  if (employee.userId) {
    await notify({
      userId: employee.userId,
      type: "attendance",
      title: decision === "approve" ? "Correction approved" : "Correction rejected",
      message:
        decision === "approve"
          ? `Your attendance for ${correction.date} was updated`
          : `Your correction for ${correction.date} was rejected${comment ? `: ${comment}` : ""}`,
      link: "/me/attendance",
    });
  }

  return correction;
};


