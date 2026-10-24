const DAY_MS = 24 * 60 * 60 * 1000;

const round4 = (value) => Math.round(value * 10000) / 10000;

// An employee is part of the headcount from the join date until the day before
// the exit date.
export const isEmployedOn = (employee, date) =>
  Boolean(employee?.joinDate) &&
  employee.joinDate <= date &&
  (!employee.exitDate || employee.exitDate > date);

export const countHeadcount = (employees, date) =>
  employees.filter((employee) => isEmployedOn(employee, date)).length;

// Exits in the period over the average of the two headcounts, as a percentage.
export const attritionRate = (exits, startHeadcount, endHeadcount) => {
  const average = (startHeadcount + endHeadcount) / 2;
  if (average === 0) return 0;
  return Math.round((exits / average) * 10000) / 100;
};

export const emptyAttendanceCounts = () => ({
  present: 0,
  late: 0,
  half_day: 0,
  absent: 0,
  missing_checkout: 0,
  on_leave: 0,
  off: 0,
});

export const attendanceRateOf = (counts) => {
  const base =
    counts.present +
    counts.late +
    counts.half_day +
    counts.absent +
    counts.missing_checkout;
  if (base === 0) return 0;
  const attended =
    counts.present + counts.late + counts.missing_checkout + counts.half_day * 0.5;
  return round4(attended / base);
};

export const latePercentOf = (counts) => {
  const base = counts.present + counts.late;
  if (base === 0) return 0;
  return round4(counts.late / base);
};

export const expectedDaysOf = (counts) =>
  counts.present +
  counts.late +
  counts.half_day +
  counts.absent +
  counts.missing_checkout +
  counts.on_leave;

export const absenteeismOf = (counts) => {
  const expected = expectedDaysOf(counts);
  if (expected === 0) return 0;
  return round4(counts.absent / expected);
};

const toUtcMs = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const daysBetween = (from, to) => (toUtcMs(to) - toUtcMs(from)) / DAY_MS;

// under_1, one_to_three or over_three years of service on the given date.
export const tenureBucketOf = (joinDate, date) => {
  if (!joinDate) return "over_three";
  const years = daysBetween(joinDate, date) / 365.25;
  if (years < 1) return "under_1";
  if (years <= 3) return "one_to_three";
  return "over_three";
};

export const meanOf = (values) => {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
};
