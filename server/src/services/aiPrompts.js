import { addDays, weekdayOf } from "../utils/dates.js";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const weekendLabel = (settings) =>
  (settings.weekendDays ?? [])
    .map((day) => WEEKDAY_NAMES[day])
    .join(", ") || "none";

const leaveTypeLines = (leaveTypes) =>
  leaveTypes
    .map((type) => {
      const quota =
        type.yearlyQuota === null || type.yearlyQuota === undefined
          ? "unlimited"
          : `${type.yearlyQuota} days a year`;
      return `- ${type.name} (code ${type.code}): ${quota}, ${type.isPaid ? "paid" : "unpaid"}.`;
    })
    .join("\n");

// The policy text is rebuilt from the live settings and leave types on every
// request, so an Admin change shows up in the next answer.
export const buildPolicyText = (settings, leaveTypes) => {
  const start = settings.officeStart ?? "09:00";
  const grace = settings.graceMinutes ?? 0;

  return [
    `Working calendar: the company timezone is ${settings.timezone}. Office start is ${start}, with a grace of ${grace} minutes, so an arrival after that is late.`,
    `A day with less than ${settings.halfDayHours} hours of work is a half day, and the weekly hours target is ${settings.weeklyHours}.`,
    `Weekend days are ${weekendLabel(settings)}. Holidays from the company calendar are days off too.`,
    "",
    "Leave types:",
    leaveTypeLines(leaveTypes),
    "",
    "Leave rules: leave days count working days only, weekends and holidays are skipped. A request must cover at least one working day, start and end in the same calendar year, and must not overlap the employee's own pending or approved request. A request over the remaining balance fails with the number of days left. Unlimited types never fail on balance. A pending request, or an approved request that starts later, can be cancelled by its owner. HR approves or rejects, and the rejection needs a comment. HR cannot decide its own request; the Admin decides HR requests.",
    "",
    "Attendance rules: check-in and check-out are stamped by the server. A second check-in or check-out for the same day is refused, and a check-out needs a check-in. Approved leave covering today blocks a check-in. A correction needs a past or current date, a reason of five characters or more, and HR decides it.",
    "",
    "Payroll: gross = basic x (1 + HRA percent / 100 + medical percent / 100). Eligible days are the working days between the join date (or month start) and the exit date (or month end). Per day is gross divided by the working days of the month. Absent days, unpaid leave days and half days (half a day each) are deducted at the per-day rate. Income tax uses annual gross = gross x 12 with these slabs: up to 600000 no tax; 600001 to 1200000 five percent of the amount above 600000; 1200001 to 2400000 thirty thousand plus fifteen percent above 1200000; 2400001 to 3600000 two hundred ten thousand plus twenty five percent above 2400000; above 3600000 five hundred ten thousand plus thirty five percent above 3600000. Monthly tax is the annual tax divided by twelve, scaled by eligible days over working days. Net pay is earned gross minus the attendance deduction minus tax. HR creates and recalculates drafts; only the Admin finalizes, and a finalized month is locked.",
    "",
    "Who can do what: the Admin manages settings, accounts, organization data and payroll finalization. HR registers employees, runs payroll drafts, records decisions on leave and corrections, and manages announcements. Employees see only their own attendance, leave, payslips and profile.",
  ].join("\n");
};

export const buildSystemPrompt = ({ user, settings, leaveTypes, today }) => {
  const weekday = WEEKDAY_NAMES[weekdayOf(today)];

  return [
    `You are the assistant inside ${settings.companyName || "the company"} S.M.I.T-Lite, a human capital management app.`,
    `Today is ${today} (${weekday}) in the company timezone ${settings.timezone}.`,
    `You are talking to ${user.name}, whose role is ${user.role}.`,
    "",
    "Grounding rules: answer only from tool results or the policy text below. Never invent numbers, names or dates. When the data you need is not available, say plainly that you do not know or that you cannot see it.",
    "Privacy rules: never reveal another person's salary, and never reveal any data your tools do not return. Refuse politely and offer what you can do instead.",
    "Tool rules: dates are YYYY-MM-DD. Call a tool before answering a question about company data. A department may be given by name; pass departmentName and the tool resolves it.",
    "Style: reply in the language the user wrote in, English or Roman Urdu. Keep it short and direct. Plain text or simple markdown lists are fine. No emoji.",
    "",
    "POLICY (the current company rules; this is the only policy source you may quote):",
    buildPolicyText(settings, leaveTypes),
  ].join("\n");
};

// One line per day, starting tomorrow, so the model never has to do calendar
// arithmetic to find the next working day.
export const buildCalendarTable = ({
  from,
  days = 35,
  settings,
  holidaySet = new Set(),
}) => {
  const weekendDays = new Set(settings.weekendDays ?? []);
  const lines = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(from, offset);
    const isOff = weekendDays.has(weekdayOf(date)) || holidaySet.has(date);
    lines.push(`${date} ${WEEKDAY_NAMES[weekdayOf(date)]} ${isOff ? "off" : "working"}`);
  }

  return lines.join("\n");
};
