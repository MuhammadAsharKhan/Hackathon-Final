import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalendarTable,
  buildPolicyText,
  buildSystemPrompt,
} from "../src/services/aiPrompts.js";

const settings = {
  companyName: "Test Co",
  timezone: "Asia/Karachi",
  officeStart: "09:00",
  graceMinutes: 15,
  halfDayHours: 5,
  weekendDays: [0, 6],
  weeklyHours: 40,
};

const leaveTypes = [
  { code: "annual", name: "Annual", yearlyQuota: 14, isPaid: true },
  { code: "sick", name: "Sick", yearlyQuota: 8, isPaid: true },
  { code: "unpaid", name: "Unpaid", yearlyQuota: null, isPaid: false },
];

test("the policy text reports the live office rules", () => {
  const text = buildPolicyText(settings, leaveTypes);

  assert.match(text, /Office start is 09:00/);
  assert.match(text, /grace of 15 minutes/);
  assert.match(text, /less than 5 hours/);
  assert.match(text, /Weekend days are Sunday, Saturday/);
  assert.match(text, /Annual \(code annual\): 14 days a year, paid/);
  assert.match(text, /Unpaid \(code unpaid\): unlimited, unpaid/);
});

test("the policy text changes when the settings change", () => {
  const changed = {
    ...settings,
    officeStart: "10:15",
    graceMinutes: 5,
    halfDayHours: 6,
    weekendDays: [5, 6],
  };

  const text = buildPolicyText(changed, leaveTypes);

  assert.match(text, /Office start is 10:15/);
  assert.match(text, /grace of 5 minutes/);
  assert.match(text, /less than 6 hours/);
  assert.match(text, /Weekend days are Friday, Saturday/);
  assert.doesNotMatch(text, /Office start is 09:00/);
});

test("the policy text follows an edited leave quota", () => {
  const text = buildPolicyText(settings, [
    { code: "annual", name: "Annual", yearlyQuota: 20, isPaid: true },
  ]);

  assert.match(text, /Annual \(code annual\): 20 days a year/);
});

test("the calendar table starts tomorrow and marks weekends and holidays", () => {
  const table = buildCalendarTable({
    from: "2026-10-25",
    days: 5,
    settings,
    holidaySet: new Set(["2026-10-27"]),
  });

  assert.deepEqual(table.split("\n"), [
    "2026-10-25 Sunday off",
    "2026-10-26 Monday working",
    "2026-10-27 Tuesday off",
    "2026-10-28 Wednesday working",
    "2026-10-29 Thursday working",
  ]);
});

test("the calendar table honours a changed weekend", () => {
  const table = buildCalendarTable({
    from: "2026-10-23",
    days: 2,
    settings: { ...settings, weekendDays: [5] },
  });

  assert.deepEqual(table.split("\n"), [
    "2026-10-23 Friday off",
    "2026-10-24 Saturday working",
  ]);
});

test("the system prompt carries the role, date and policy", () => {
  const prompt = buildSystemPrompt({
    user: { name: "Hina Malik", role: "hr" },
    settings,
    leaveTypes,
    today: "2026-10-24",
  });

  assert.match(prompt, /Today is 2026-10-24 \(Saturday\)/);
  assert.match(prompt, /talking to Hina Malik, whose role is hr/);
  assert.match(prompt, /never reveal another person's salary/);
  assert.match(prompt, /Office start is 09:00/);
  assert.match(prompt, /Roman Urdu/);
});
