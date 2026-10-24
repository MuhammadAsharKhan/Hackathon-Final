const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const BUSINESS_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// A business date is a plain YYYY-MM-DD string in company time. Parsing it as
// an instant would shift it by a day west of UTC, so the parts are read as-is.
const asLocalDate = (value) => {
  const match = typeof value === "string" ? value.match(BUSINESS_DATE) : null;
  if (!match) return new Date(value);

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const formatDate = (value) => {
  if (!value) return "-";
  return dateFormatter.format(asLocalDate(value));
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
};

export const formatDateRange = (from, to) => {
  if (!from) return "-";
  if (!to || to === from) return formatDate(from);
  return `${formatDate(from)} to ${formatDate(to)}`;
};

const moneyFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

// Amounts are PKR and whole rupees read better than paisa in tables. The
// currency is written once here so no page decides how money looks.
export const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return `PKR ${moneyFormatter.format(Math.round(Number(value) || 0))}`;
};

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

// Ratios arrive as fractions (0.157) and are printed as percentages.
export const formatRatio = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${percentFormatter.format(Number(value) * 100)}%`;
};

const timeFormatters = new Map();

const timeFormatterFor = (timeZone) => {
  const key = timeZone || "device";
  if (!timeFormatters.has(key)) {
    timeFormatters.set(
      key,
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        ...(timeZone ? { timeZone } : {}),
      })
    );
  }
  return timeFormatters.get(key);
};

const dateTimeFormatters = new Map();

const dateTimeFormatterFor = (timeZone) => {
  const key = timeZone || "device";
  if (!dateTimeFormatters.has(key)) {
    dateTimeFormatters.set(
      key,
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        ...(timeZone ? { timeZone } : {}),
      })
    );
  }
  return dateTimeFormatters.get(key);
};

// Instants are printed in the company timezone when the page knows it.
export const formatTime = (value, timeZone) => {
  if (!value) return "-";
  return timeFormatterFor(timeZone).format(new Date(value));
};

export const formatDateTimeIn = (value, timeZone) => {
  if (!value) return "-";
  return dateTimeFormatterFor(timeZone).format(new Date(value));
};
