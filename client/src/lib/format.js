const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

export const formatDate = (value) => dateFormatter.format(new Date(value));

export const formatShortDate = (value) =>
  shortDateFormatter.format(new Date(value));
