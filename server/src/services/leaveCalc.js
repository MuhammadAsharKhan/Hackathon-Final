import { countWorkingDays } from "../utils/dates.js";

export const countLeaveDays = (from, to, settings, holidaySet) =>
  countWorkingDays(from, to, settings, holidaySet);

export const rangesOverlap = (firstStart, firstEnd, secondStart, secondEnd) =>
  firstStart <= secondEnd && secondStart <= firstEnd;

export const overlapsAny = (startDate, endDate, requests) =>
  requests.some((request) =>
    rangesOverlap(startDate, endDate, request.startDate, request.endDate)
  );

// Remaining is what can still be requested: quota minus approved and pending.
export const remainingDays = (quota, used, pending = 0) =>
  quota === null || quota === undefined ? null : quota - used - pending;

export const exceedsQuota = (quota, used, pending, requested) =>
  quota !== null && quota !== undefined && used + pending + requested > quota;

export const availableToRequest = (quota, used, pending = 0) =>
  quota === null || quota === undefined
    ? Number.POSITIVE_INFINITY
    : Math.max(0, quota - used - pending);
