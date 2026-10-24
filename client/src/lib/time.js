const CLOCK_OPTIONS = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const formatters = new Map();

// Clock formatting depends on the zone, so one formatter per zone is cached.
const clockFormatter = (timeZone) => {
  const key = timeZone || "device";
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.DateTimeFormat("en-GB", {
        ...CLOCK_OPTIONS,
        ...(timeZone ? { timeZone } : {}),
      })
    );
  }

  return formatters.get(key);
};

const PLAIN_TIME = /^\d{2}:\d{2}$/;

// A record holds an instant, while a correction request holds a plain HH:mm in
// company time, so the plain value is already the answer.
export const formatClock = (value, timeZone) => {
  if (!value) return "-";
  if (PLAIN_TIME.test(value)) return value;
  return clockFormatter(timeZone).format(new Date(value));
};

export const formatHours = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

export const percentLabel = (ratio) =>
  `${Math.round((Number(ratio) || 0) * 100)}%`;

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export const monthLabel = (month) => {
  const match = typeof month === "string" ? month.match(MONTH_PATTERN) : null;
  if (!match) return month || "-";

  return MONTH_FORMATTER.format(
    new Date(Number(match[1]), Number(match[2]) - 1, 1)
  );
};

// The month and day pickers need a value in the device's own calendar, which
// toISOString would shift for users east and west of UTC.
export const deviceToday = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export const deviceMonth = () => deviceToday().slice(0, 7);

// Business dates belong to the company calendar, so the dashboard ranges are
// read in that zone when the page knows it.
export const todayInZone = (timeZone) => {
  if (!timeZone) return deviceToday();
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
};

export const addDays = (dateString, days) =>
  new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

export const addMonths = (monthString, months) => {
  const [year, month] = monthString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 7);
};

export const weekdayLabel = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
};

export const dayOfMonth = (dateString) => Number(dateString.slice(8, 10));

// Monday first, matching the attendance calendar.
export const leadingBlanks = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  return (firstWeekday + 6) % 7;
};
