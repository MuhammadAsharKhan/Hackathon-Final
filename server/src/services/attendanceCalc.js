import {
  eachDay,
  isWorkingDay,
  localMinutesOfDay,
  timeStringToMinutes,
} from "../utils/dates.js";
import { distanceMeters } from "../utils/haversine.js";

const DEFAULT_OFFICE_START = "09:00";
const DEFAULT_GRACE_MINUTES = 15;
const DEFAULT_HALF_DAY_HOURS = 5;
const DEFAULT_RADIUS_METERS = 150;
const CAMERA_MAX_ACCURACY_METERS = 100;

// Every status a day can show, used by the attendance board filter.
export const DAY_STATUSES = [
  "present",
  "late",
  "half_day",
  "absent",
  "missing_checkout",
  "on_leave",
  "off",
  "not_employed",
  "future",
];

export const isCloseToOffice = (settings) =>
  settings?.officeLat !== null &&
  settings?.officeLat !== undefined &&
  settings?.officeLng !== null &&
  settings?.officeLng !== undefined;

// 09:15 exactly is not late; 09:16 is.
export const computeCheckInStatus = (instant, settings) => {
  const arrivalMinutes = localMinutesOfDay(instant, settings?.timezone);
  const startMinutes =
    timeStringToMinutes(settings?.officeStart ?? DEFAULT_OFFICE_START) ??
    timeStringToMinutes(DEFAULT_OFFICE_START);
  const graceMinutes = settings?.graceMinutes ?? DEFAULT_GRACE_MINUTES;

  return arrivalMinutes > startMinutes + graceMinutes ? "late" : "present";
};

// half_day overrides late when the day is short.
export const computeCheckOutStatus = (record, instant, settings) => {
  const checkInTime = new Date(record.checkIn).getTime();
  const workedMinutes = Math.max(
    0,
    Math.round((instant.getTime() - checkInTime) / 60000)
  );
  const halfDayMinutes =
    (settings?.halfDayHours ?? DEFAULT_HALF_DAY_HOURS) * 60;
  const arrivalStatus = record.status === "late" ? "late" : "present";

  return {
    workedMinutes,
    status: workedMinutes < halfDayMinutes ? "half_day" : arrivalStatus,
  };
};

// Camera check-in is the strict path; web check-in never rejects on location.
export const evaluateCameraLocation = ({
  settings,
  lat,
  lng,
  accuracy,
  faceCount,
}) => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return {
      allowed: false,
      reason: "Camera check-in needs a location",
      distanceMeters: null,
    };
  }

  if (faceCount !== 1) {
    return {
      allowed: false,
      reason: "Camera check-in needs exactly one face in the photo",
      distanceMeters: null,
    };
  }

  if (!(accuracy <= CAMERA_MAX_ACCURACY_METERS)) {
    return {
      allowed: false,
      reason: "Camera check-in needs a location accuracy of 100 meters or better",
      distanceMeters: null,
    };
  }

  if (!isCloseToOffice(settings)) {
    return {
      allowed: false,
      reason: "The office location is not set, so camera check-in is unavailable",
      distanceMeters: null,
    };
  }

  const distance = distanceMeters(settings.officeLat, settings.officeLng, lat, lng);
  const radiusMeters = settings.radiusMeters ?? DEFAULT_RADIUS_METERS;

  if (distance > radiusMeters) {
    return {
      allowed: false,
      reason: `You are ${Math.round(distance)} meters from the office, outside the ${radiusMeters} meter radius`,
      distanceMeters: distance,
    };
  }

  return { allowed: true, reason: null, distanceMeters: distance };
};

const readRecordForDate = (records, date) => {
  if (!records) return null;
  if (typeof records.get === "function") return records.get(date) ?? null;
  return records[date] ?? null;
};

const leavesOn = (approvedLeaveDates, date) =>
  Boolean(approvedLeaveDates?.has?.(date));

// One entry per day. The order of the rules is the order in the specification:
// employment, future, calendar, leave, record, absent.
export const buildEmployeeDays = ({
  employee,
  from,
  to,
  settings,
  holidaySet,
  records,
  approvedLeaveDates,
  today,
}) =>
  eachDay(from, to).map((date) => {
    const working = isWorkingDay(date, settings, holidaySet);
    const record = readRecordForDate(records, date);
    const entry = { date, status: "absent", record, isWorkingDay: working };

    if (employee.joinDate && date < employee.joinDate) {
      return { ...entry, status: "not_employed" };
    }
    if (employee.exitDate && date > employee.exitDate) {
      return { ...entry, status: "not_employed" };
    }
    if (date > today) {
      return { ...entry, status: "future" };
    }
    if (!working) {
      return { ...entry, status: "off" };
    }
    if (leavesOn(approvedLeaveDates, date)) {
      return { ...entry, status: "on_leave" };
    }
    if (record) {
      if (!record.checkOut && date < today) {
        return { ...entry, status: "missing_checkout" };
      }
      return { ...entry, status: record.status };
    }

    return entry;
  });

// Counts and rates for a month view. Attendance rate is a ratio, matching the
// dashboard definition in the specification.
export const summarizeEmployeeDays = (days) => {
  const counts = {
    present: 0,
    late: 0,
    half_day: 0,
    absent: 0,
    missing_checkout: 0,
    on_leave: 0,
    off: 0,
  };
  let workedMinutes = 0;

  for (const day of days) {
    if (counts[day.status] !== undefined) counts[day.status] += 1;
    workedMinutes += day.record?.workedMinutes ?? 0;
  }

  const expectedDays =
    counts.present +
    counts.late +
    counts.half_day +
    counts.absent +
    counts.missing_checkout +
    counts.on_leave;

  const attendedDays =
    counts.present + counts.late + counts.missing_checkout + counts.half_day * 0.5;
  const rateBase =
    counts.present + counts.late + counts.half_day + counts.absent + counts.missing_checkout;
  const attendanceRate =
    rateBase === 0 ? 0 : Math.round((attendedDays / rateBase) * 10000) / 10000;

  return {
    present: counts.present,
    late: counts.late,
    halfDay: counts.half_day,
    absent: counts.absent,
    missingCheckout: counts.missing_checkout,
    onLeave: counts.on_leave,
    off: counts.off,
    expectedDays,
    workedMinutes,
    lateCount: counts.late,
    attendanceRate,
  };
};
