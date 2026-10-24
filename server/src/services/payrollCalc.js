import { countWorkingDays, monthBounds } from "../utils/dates.js";
import { round2 } from "../utils/money.js";

const DEFAULT_HRA_PERCENT = 40;
const DEFAULT_MEDICAL_PERCENT = 10;

export const grossOf = (
  basicSalary,
  hraPercent = DEFAULT_HRA_PERCENT,
  medicalPercent = DEFAULT_MEDICAL_PERCENT
) =>
  round2(
    Number(basicSalary) *
      (1 + Number(hraPercent) / 100 + Number(medicalPercent) / 100)
  );

// Annual tax on a yearly gross, following the slabs in the specification.
export const annualTax = (annualGross) => {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) return 0.05 * (annualGross - 600000);
  if (annualGross <= 2400000) return 30000 + 0.15 * (annualGross - 1200000);
  if (annualGross <= 3600000) return 210000 + 0.25 * (annualGross - 2400000);
  return 510000 + 0.35 * (annualGross - 3600000);
};

const inEligibleWindow = (day, windowStart, windowEnd, today) =>
  day.date >= windowStart && day.date <= windowEnd && day.date <= today;

// Every money field of a payslip for one employee and one month. Days after
// today never count as absent, and off days never enter the deduction.
export const calculatePayslip = ({
  employee,
  month,
  settings,
  holidaySet,
  days,
  today,
}) => {
  const { start, end } = monthBounds(month);
  const workingDays = countWorkingDays(start, end, settings, holidaySet);

  const windowStart = employee.joinDate > start ? employee.joinDate : start;
  const exitDate = employee.exitDate && employee.exitDate < end ? employee.exitDate : end;
  const windowEnd = exitDate;
  const eligibleDays =
    windowStart > windowEnd
      ? 0
      : countWorkingDays(windowStart, windowEnd, settings, holidaySet);

  const basic = Number(employee.basicSalary);
  const hraPercent = employee.hraPercent ?? DEFAULT_HRA_PERCENT;
  const medicalPercent = employee.medicalPercent ?? DEFAULT_MEDICAL_PERCENT;

  const hra = round2((basic * hraPercent) / 100);
  const medical = round2((basic * medicalPercent) / 100);
  const gross = grossOf(basic, hraPercent, medicalPercent);

  const perDayRaw = workingDays === 0 ? 0 : gross / workingDays;
  const perDay = round2(perDayRaw);
  const earnedGross =
    workingDays === 0 ? 0 : round2((gross * eligibleDays) / workingDays);

  const countedDays = days.filter((day) =>
    inEligibleWindow(day, windowStart, windowEnd, today)
  );

  const absentDays = countedDays.filter((day) => day.status === "absent").length;
  const halfDays = countedDays.filter((day) => day.status === "half_day").length;
  const unpaidDays = countedDays.filter(
    (day) => day.status === "on_leave" && day.leavePaid === false
  ).length;

  const absentDeduction = round2(perDayRaw * absentDays);
  const unpaidDeduction = round2(perDayRaw * unpaidDays);
  const halfDayDeduction = round2(perDayRaw * 0.5 * halfDays);
  const attendanceDeduction = round2(
    perDayRaw * (absentDays + unpaidDays + 0.5 * halfDays)
  );

  const annualTaxableAmount = round2(gross * 12);
  const annualTaxAmount = round2(annualTax(annualTaxableAmount));
  const tax = round2(
    workingDays === 0
      ? 0
      : (annualTaxAmount / 12) * (eligibleDays / workingDays)
  );

  const netPay = Math.max(0, round2(earnedGross - attendanceDeduction - tax));

  return {
    basic,
    hra,
    medical,
    gross,
    workingDays,
    eligibleDays,
    perDay,
    earnedGross,
    absentDays,
    unpaidDays,
    halfDays,
    absentDeduction,
    unpaidDeduction,
    halfDayDeduction,
    attendanceDeduction,
    annualTax: annualTaxAmount,
    tax,
    netPay,
  };
};
