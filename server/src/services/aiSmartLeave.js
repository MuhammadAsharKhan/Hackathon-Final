import { z } from "zod";
import LeaveType from "../models/LeaveType.js";
import { now } from "../utils/clock.js";
import { addDays, isValidDateString, todayIn, weekdayOf } from "../utils/dates.js";
import { callWithPool } from "./aiKeyPool.js";
import { loadAiSettings } from "./aiSetup.js";
import { buildCalendarTable } from "./aiPrompts.js";
import { getCalendar } from "./calendarService.js";
import { previewLeave } from "./leaveService.js";
import { getSettings } from "./settingsService.js";

const CALENDAR_DAYS = 35;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const dateSchema = z
  .string()
  .trim()
  .refine(isValidDateString, { message: "Date must be YYYY-MM-DD" });

export const smartLeaveSchema = (codes) =>
  z
    .object({
      // Codes are stored as lowercase slugs, but a model may answer with the
      // type name it saw ("Casual"), so the case is folded before the match.
      type: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.enum(codes, "Unknown leave type")),
      startDate: dateSchema,
      endDate: dateSchema,
      reason: z.string().trim().min(3, "Reason is too short").max(300, "Reason is too long"),
    })
    .refine((value) => value.startDate <= value.endDate, {
      message: "startDate is after endDate",
    });

const parseSuggestion = (text, codes) => {
  const cleaned = String(text ?? "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = smartLeaveSchema(codes).safeParse(
      JSON.parse(cleaned.slice(start, end + 1))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const requestSuggestion = async (aiSettings, systemPrompt, userPrompt, deadline, codes) => {
  const answer = await callWithPool({
    settings: aiSettings,
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    deadline,
  });

  return parseSuggestion(answer.text, codes);
};

export const suggestLeave = async (
  user,
  message,
  { now: currentInstant = now() } = {}
) => {
  const settings = await getSettings();
  const today = todayIn(settings?.timezone, currentInstant);
  const tomorrow = addDays(today, 1);

  const [leaveTypes, aiSettings, calendar] = await Promise.all([
    LeaveType.find().sort({ code: 1 }).lean(),
    loadAiSettings(),
    getCalendar(tomorrow, addDays(today, CALENDAR_DAYS)),
  ]);

  if (leaveTypes.length === 0) return { fallback: true };

  const table = buildCalendarTable({
    from: tomorrow,
    days: CALENDAR_DAYS,
    settings,
    holidaySet: calendar.holidaySet,
  });

  const typeLines = leaveTypes
    .map((type) => `- ${type.code}: ${type.name}${type.isPaid ? "" : " (unpaid)"}`)
    .join("\n");

  const systemPrompt = [
    "You turn a leave request written in plain English or Roman Urdu into exact leave dates.",
    `Today is ${today} (${WEEKDAY_NAMES[weekdayOf(today)]}). "next Monday" means the first Monday strictly after today.`,
    "A range such as \"Monday and Tuesday\" means consecutive working days found in the calendar table.",
    "Match the reason to a type: wedding, family, personal -> casual; ill, fever, doctor -> sick; vacation, trip -> annual; no pay -> unpaid.",
    "Only use dates from the calendar table, and only working days unless the whole range has none.",
    "Return only JSON, with no code fences, in this shape: {\"type\": \"<code>\", \"startDate\": \"YYYY-MM-DD\", \"endDate\": \"YYYY-MM-DD\", \"reason\": \"<short reason>\"}.",
    "",
    "Leave type codes:",
    typeLines,
    "",
    "Calendar (date, weekday, working or off):",
    table,
  ].join("\n");

  const userPrompt = `Leave request: ${message}`;
  const codes = leaveTypes.map((type) => type.code);
  const deadline = Date.now() + 15000;

  let suggestion = null;
  for (let attempt = 0; attempt < 2 && !suggestion; attempt += 1) {
    try {
      suggestion = await requestSuggestion(
        aiSettings,
        systemPrompt,
        userPrompt,
        deadline,
        codes
      );
    } catch {
      return { fallback: true };
    }
  }

  if (!suggestion) return { fallback: true };

  const preview = await previewLeave(user, {
    leaveTypeCode: suggestion.type,
    startDate: suggestion.startDate,
    endDate: suggestion.endDate,
  });

  return {
    type: suggestion.type,
    startDate: suggestion.startDate,
    endDate: suggestion.endDate,
    reason: suggestion.reason,
    days: preview.days,
    valid: preview.valid,
    problem: preview.valid ? null : preview.reason,
    aiGenerated: true,
  };
};
