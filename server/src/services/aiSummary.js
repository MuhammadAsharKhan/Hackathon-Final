import { z } from "zod";
import { now } from "../utils/clock.js";
import { round2 } from "../utils/money.js";
import { callWithPool } from "./aiKeyPool.js";
import { loadAiSettings } from "./aiSetup.js";
import { buildAdminDashboard, buildHrDashboard } from "./dashboardService.js";

const bulletsSchema = z.object({
  bullets: z.array(z.string().trim().min(1).max(240)).min(3).max(5),
});

const money = (value) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
    Number(value ?? 0)
  );

const percentOf = (ratio) => `${round2(Number(ratio ?? 0) * 100)}%`;

// The same KPI JSON the dashboard shows, so the numbers can never disagree.
const loadKpis = async (role, filters, currentInstant) =>
  role === "admin"
    ? buildAdminDashboard(filters, { now: currentInstant })
    : buildHrDashboard(filters, { now: currentInstant });

export const fallbackBullets = (role, kpi) => {
  if (role === "admin") {
    const bullets = [
      `Headcount is ${kpi.headcount?.count ?? 0}.`,
      `Attrition this year is ${round2(kpi.attritionYtd?.rate ?? 0)}% with ${kpi.attritionYtd?.exits ?? 0} exit(s).`,
    ];

    const months = kpi.payrollCost?.byMonth ?? [];
    if (months.length > 0) {
      const net = months.reduce((total, row) => total + row.net, 0);
      bullets.push(`Finalized payroll net pay totals PKR ${money(net)} across ${months.length} month(s).`);
    } else {
      bullets.push("No payroll month is finalized yet.");
    }

    const salaryRow = kpi.averageSalary?.byDepartment?.[0];
    if (salaryRow) {
      bullets.push(
        `Average gross salary is PKR ${money(salaryRow.averageGross)} in ${salaryRow.department}.`
      );
    }

    const departmentRow = kpi.headcountByDepartment?.[0];
    if (departmentRow) {
      bullets.push(`The largest department is ${departmentRow.department} with ${departmentRow.count} people.`);
    }

    return bullets.slice(0, 5);
  }

  const bullets = [
    `Headcount is ${kpi.headcount ?? 0}.`,
    `Today ${kpi.presentToday ?? 0} present, ${kpi.onLeaveToday ?? 0} on leave and ${kpi.lateToday ?? 0} late.`,
    `Pending approvals: ${kpi.pendingApprovals?.leave ?? 0} leave request(s) and ${kpi.pendingApprovals?.corrections ?? 0} correction(s).`,
  ];

  const trend = kpi.attendanceTrend ?? [];
  if (trend.length > 0) {
    const latest = trend[trend.length - 1];
    bullets.push(`Attendance rate on ${latest.date} is ${percentOf(latest.rate)}.`);
  }

  const lateComer = kpi.topLateComers?.[0];
  if (lateComer) {
    bullets.push(`Most late days: ${lateComer.name} with ${lateComer.lateDays}.`);
  }

  return bullets.slice(0, 5);
};

const parseBullets = (text) => {
  const cleaned = String(text ?? "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = bulletsSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    return parsed.success ? parsed.data.bullets : null;
  } catch {
    return null;
  }
};

const askForBullets = async (aiSettings, systemPrompt, userPrompt, deadline) => {
  const answer = await callWithPool({
    settings: aiSettings,
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    deadline,
  });

  return parseBullets(answer.text);
};

export const summarizeDashboard = async (
  user,
  filters,
  { now: currentInstant = now() } = {}
) => {
  const kpi = await loadKpis(user.role, filters, currentInstant);
  const fallback = fallbackBullets(user.role, kpi);

  let aiSettings;
  try {
    aiSettings = await loadAiSettings();
  } catch {
    return { bullets: fallback, aiGenerated: false, fallback: true };
  }

  const systemPrompt = [
    `You write dashboard summaries for a ${user.role} in an HR system.`,
    "Use only the numbers inside the KPI JSON. Never invent, round to new numbers or compare with anything outside it.",
    "Return only JSON, with no code fences, in this shape: {\"bullets\": [\"...\"]}.",
    "Write 3 to 5 bullets, each shorter than 160 characters, plain English, no emoji.",
  ].join("\n");

  const userPrompt = [
    `Filters: ${JSON.stringify(kpi.filters ?? filters ?? {})}`,
    "KPI JSON:",
    JSON.stringify(kpi),
  ].join("\n");

  const deadline = Date.now() + 15000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const bullets = await askForBullets(
        aiSettings,
        systemPrompt,
        userPrompt,
        deadline
      );
      if (bullets) {
        return { bullets, aiGenerated: true, fallback: false };
      }
    } catch {
      // A provider failure ends the retries; the fallback covers the answer.
      break;
    }
  }

  return { bullets: fallback, aiGenerated: false, fallback: true };
};
