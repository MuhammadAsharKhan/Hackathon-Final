import test from "node:test";
import assert from "node:assert/strict";
import { fallbackBullets } from "../src/services/aiSummary.js";

const adminKpi = {
  filters: { from: "2026-09-01", to: "2026-09-30", department: null },
  headcount: { date: "2026-09-30", count: 3 },
  attritionYtd: { exits: 1, rate: 28.57 },
  payrollCost: {
    byMonth: [
      { month: "2026-09", employees: 4, gross: 495000, net: 399000 },
    ],
    byDepartment: [],
  },
  averageSalary: {
    byDepartment: [{ department: "Engineering", averageGross: 115000 }],
    byDesignation: [],
  },
  headcountByDepartment: [{ department: "Engineering", count: 3 }],
  gender: [],
  tenure: { underOneYear: 3, oneToThreeYears: 0, overThreeYears: 0 },
  auditFeed: [],
};

const hrKpi = {
  filters: { from: "2026-09-01", to: "2026-09-30", department: null },
  headcount: 3,
  presentToday: 2,
  onLeaveToday: 1,
  lateToday: 0,
  pendingApprovals: { leave: 2, corrections: 1 },
  attendanceTrend: [
    { date: "2026-09-29", rate: 0.96 },
    { date: "2026-09-30", rate: 0.98 },
  ],
  absenteeismByDepartment: [],
  leaveByType: [],
  topLateComers: [{ name: "Sara Khan", lateDays: 4 }],
  leaveUtilization: [],
};

test("the admin fallback quotes the KPI numbers", () => {
  const bullets = fallbackBullets("admin", adminKpi);

  assert.ok(bullets.length >= 3 && bullets.length <= 5);
  assert.ok(bullets.some((line) => line.includes("Headcount is 3")));
  assert.ok(bullets.some((line) => line.includes("28.57%")));
  assert.ok(bullets.some((line) => line.includes("PKR 399,000")));
  assert.ok(bullets.some((line) => line.includes("PKR 115,000")));
  assert.ok(bullets.every((line) => line.length < 240));
});

test("the admin fallback handles a company with no finalized payroll", () => {
  const bullets = fallbackBullets("admin", {
    ...adminKpi,
    payrollCost: { byMonth: [], byDepartment: [] },
    averageSalary: { byDepartment: [], byDesignation: [] },
    headcountByDepartment: [],
  });

  assert.ok(bullets.length >= 3 && bullets.length <= 5);
  assert.ok(bullets.some((line) => line.includes("No payroll month is finalized yet")));
});

test("the HR fallback covers today, approvals and the latest rate", () => {
  const bullets = fallbackBullets("hr", hrKpi);

  assert.ok(bullets.length >= 3 && bullets.length <= 5);
  assert.ok(bullets.some((line) => line.includes("2 present, 1 on leave and 0 late")));
  assert.ok(bullets.some((line) => line.includes("2 leave request(s) and 1 correction(s)")));
  assert.ok(bullets.some((line) => line.includes("98%")));
  assert.ok(bullets.some((line) => line.includes("Sara Khan")));
});

test("the HR fallback works without a trend", () => {
  const bullets = fallbackBullets("hr", {
    ...hrKpi,
    attendanceTrend: [],
    topLateComers: [],
  });

  assert.ok(bullets.length >= 3 && bullets.length <= 5);
});
