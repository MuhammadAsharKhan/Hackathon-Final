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
