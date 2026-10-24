import { asyncHandler } from "../utils/asyncHandler.js";
import {
  applyLeave,
  cancelLeave,
  decideLeave,
  getBalance,
  listLeaveRequests,
  previewLeave,
} from "../services/leaveService.js";

export const getLeaveBalance = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getBalance(req.user, req.query.year),
  });
});

export const previewLeaveRequest = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await previewLeave(req.user, req.body),
  });
});

export const createLeaveRequest = asyncHandler(async (req, res) => {
  const request = await applyLeave(req.user, req.body);

  res.status(201).json({
    success: true,
    data: { request },
    message: "Leave request submitted",
  });
});

export const getLeaveRequests = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await listLeaveRequests(req.user, req.query),
  });
});

export const patchLeaveCancel = asyncHandler(async (req, res) => {
  const request = await cancelLeave(req.user, req.params.id);

  res.json({
    success: true,
    data: { request },
    message: "Leave request cancelled",
  });
});

export const patchLeaveDecision = asyncHandler(async (req, res) => {
  const request = await decideLeave(req.user, req.params.id, req.body);

  res.json({
    success: true,
    data: { request },
    message: request.status === "approved" ? "Leave approved" : "Leave rejected",
  });
});
