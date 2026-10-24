import Holiday from "../models/Holiday.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "../services/auditService.js";

const findHoliday = async (holidayId) => {
  const holiday = await Holiday.findById(holidayId);
  if (!holiday) throw new ApiError(404, "Holiday not found");
  return holiday;
};

export const listHolidays = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.year) {
    filter.date = { $gte: `${req.query.year}-01-01`, $lte: `${req.query.year}-12-31` };
  }

  const holidays = await Holiday.find(filter).sort({ date: 1 });
  res.json({ success: true, data: { holidays } });
});

export const createHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.create(req.body);

  await log(req.user, "holiday.create", "holiday", holiday.id, null, holiday);

  res.status(201).json({
    success: true,
    data: { holiday },
    message: "Holiday created",
  });
});

export const updateHoliday = asyncHandler(async (req, res) => {
  const holiday = await findHoliday(req.params.id);
  const before = holiday.toJSON();

  holiday.set(req.body);
  await holiday.save();

  await log(req.user, "holiday.update", "holiday", holiday.id, before, holiday);

  res.json({ success: true, data: { holiday }, message: "Holiday updated" });
});

export const deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await findHoliday(req.params.id);

  const before = holiday.toJSON();
  await holiday.deleteOne();
  await log(req.user, "holiday.delete", "holiday", holiday.id, before, null);

  res.json({ success: true, data: { deleted: true }, message: "Holiday deleted" });
});
