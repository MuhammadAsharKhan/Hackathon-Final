export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export const TIMEZONE_OPTIONS = [
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

// A zone stored by an earlier admin stays selectable even when it is not in
// the short list above.
export const timezoneChoices = (current) => {
  const list = [...TIMEZONE_OPTIONS];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
};
