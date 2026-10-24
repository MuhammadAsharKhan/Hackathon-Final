const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DEFAULT_TIMEZONE = "Asia/Karachi";

// Wall-clock parts of an instant in the given zone. The server runs in UTC, so
// every business date goes through here and never through a local getter.
const zonedParts = (instant, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

const pad = (value, size = 2) => String(value).padStart(size, "0");

const toDateString = ({ year, month, day }) =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

export const parseDateString = (dateString) => {
  if (typeof dateString !== "string" || !DATE_PATTERN.test(dateString)) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(instant.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return { year, month, day, instant };
};

// Business date of "now" in the company timezone.
export const todayIn = (timeZone = DEFAULT_TIMEZONE, currentInstant = new Date()) =>
  toDateString(zonedParts(currentInstant, timeZone));

// Business date of any instant, used for check-in and check-out records.
export const localDateOf = (instant, timeZone = DEFAULT_TIMEZONE) =>
  toDateString(zonedParts(instant, timeZone));

export const localMinutesOfDay = (instant, timeZone = DEFAULT_TIMEZONE) => {
  const parts = zonedParts(instant, timeZone);
  return parts.hour * 60 + parts.minute;
};

// Reads a wall-clock time in the company timezone and returns the UTC instant.
export const zonedToUtc = (dateString, timeString, timeZone = DEFAULT_TIMEZONE) => {
  const { year, month, day } = parseDateString(dateString);

  const timeMatch = TIME_PATTERN.exec(timeString ?? "");
  if (!timeMatch) throw new Error(`Invalid time: ${timeString}`);

  const wantedAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );

  // Two passes settle the offset, including the hour around a DST change.
  let resolved = wantedAsUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    const localParts = zonedParts(new Date(resolved), timeZone);
    const localAsUtc = Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour,
      localParts.minute,
      localParts.second
    );
    resolved += wantedAsUtc - localAsUtc;
  }

  return new Date(resolved);
};

export const addDays = (dateString, days) => {
  const { year, month, day } = parseDateString(dateString);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return toDateString({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
};

// 0 is Sunday, matching settings.weekendDays.
export const weekdayOf = (dateString) => {
  const { instant } = parseDateString(dateString);
  return instant.getUTCDay();
};

export const eachDay = (from, to) => {
  if (from > to) return [];

  const days = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
};

export const monthBounds = (month) => {
  if (typeof month !== "string" || !MONTH_PATTERN.test(month)) {
    throw new Error(`Invalid month: ${month}`);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    start: `${pad(year, 4)}-${pad(monthNumber)}-01`,
    end: `${pad(year, 4)}-${pad(monthNumber)}-${pad(lastDay)}`,
  };
};

export const isWorkingDay = (dateString, settings, holidaySet) => {
  const weekendDays = settings?.weekendDays ?? [0, 6];
  if (weekendDays.includes(weekdayOf(dateString))) return false;
  if (holidaySet?.has(dateString)) return false;
  return true;
};

export const listWorkingDays = (from, to, settings, holidaySet) =>
  eachDay(from, to).filter((date) => isWorkingDay(date, settings, holidaySet));

export const countWorkingDays = (from, to, settings, holidaySet) =>
  listWorkingDays(from, to, settings, holidaySet).length;

export const isValidDateString = (dateString) => {
  if (typeof dateString !== "string" || !DATE_PATTERN.test(dateString)) {
    return false;
  }
  return addDays(dateString, 0) === dateString;
};

export const isValidMonthString = (month) =>
  typeof month === "string" && MONTH_PATTERN.test(month);

export const DAY_IN_MS = DAY_MS;
export const DEFAULT_TIMEZONE_NAME = DEFAULT_TIMEZONE;
