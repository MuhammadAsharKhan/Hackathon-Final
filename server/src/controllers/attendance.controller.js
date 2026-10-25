import { asyncHandler } from "../utils/asyncHandler.js";
import {
  checkIn,
  checkOut,
  createCorrection,
  decideCorrection,
  enrollFace,
  getBoard,
  getEmployeeMonth,
  getFaceStatus,
  getMyMonth,
  getTodayView,
  listCorrections,
  removeFace,
} from "../services/attendanceService.js";

export const getToday = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getTodayView(req.user) });
});

export const postCheckIn = asyncHandler(async (req, res) => {
  const record = await checkIn(req.user, req.body);

  res.status(201).json({
    success: true,
    data: { record },
    message: "Checked in",
  });
});

export const postCheckOut = asyncHandler(async (req, res) => {
  const record = await checkOut(req.user, req.body);

  res.json({
    success: true,
    data: { record },
    message: "Checked out",
  });
});

export const getMyAttendance = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getMyMonth(req.user, req.query.month),
  });
});

export const getAttendanceBoard = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getBoard(req.query) });
});

export const getEmployeeAttendance = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getEmployeeMonth(req.params.employeeId, req.query.month),
  });
});

export const postCorrection = asyncHandler(async (req, res) => {
  const correction = await createCorrection(req.user, req.body);

  res.status(201).json({
    success: true,
    data: { correction },
    message: "Correction requested",
  });
});

export const getCorrections = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await listCorrections(req.user, req.query),
  });
});

export const patchCorrection = asyncHandler(async (req, res) => {
  const correction = await decideCorrection(req.user, req.params.id, req.body);

  res.json({
    success: true,
    data: { correction },
    message:
      correction.status === "approved" ? "Correction approved" : "Correction rejected",
  });
});

export const getOwnFaceStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getFaceStatus(req.user) });
});

export const postFaceEnroll = asyncHandler(async (req, res) => {
  const data = await enrollFace(req.user, req.body.descriptor);

  res.status(201).json({
    success: true,
    data,
    message: "Face enrolled",
  });
});

export const deleteOwnFace = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await removeFace(req.user),
    message: "Face enrolment removed",
  });
});

export const deleteEmployeeFace = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await removeFace(req.user, req.params.employeeId),
    message: "Face enrolment removed",
  });
});
