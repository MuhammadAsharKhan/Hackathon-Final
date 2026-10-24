import Holiday from "../models/Holiday.js";
import { getSettings } from "./settingsService.js";

// Working-day maths needs the holiday set for the range, never the whole year.
export const getHolidaySet = async (from, to) => {
  const filter = {};

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const holidays = await Holiday.find(filter).select("date").lean();
  return new Set(holidays.map((holiday) => holiday.date));
};

export const getCalendar = async (from, to) => {
  const [settings, holidaySet] = await Promise.all([
    getSettings(),
    getHolidaySet(from, to),
  ]);

  return { settings, holidaySet };
};
