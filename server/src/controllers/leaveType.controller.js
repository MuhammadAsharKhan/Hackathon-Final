import LeaveRequest from "../models/LeaveRequest.js";
import LeaveType from "../models/LeaveType.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "../services/auditService.js";

const findLeaveType = async (leaveTypeId) => {
  const leaveType = await LeaveType.findById(leaveTypeId);
  if (!leaveType) throw new ApiError(404, "Leave type not found");
  return leaveType;
};

export const listLeaveTypes = asyncHandler(async (req, res) => {
  const leaveTypes = await LeaveType.find().sort({ name: 1 });
  res.json({ success: true, data: { leaveTypes } });
});

export const createLeaveType = asyncHandler(async (req, res) => {
  const leaveType = await LeaveType.create({
    code: req.body.code,
    name: req.body.name,
    yearlyQuota: req.body.yearlyQuota ?? null,
    isPaid: req.body.isPaid ?? true,
  });

  await log(req.user, "leaveType.create", "leaveType", leaveType.id, null, leaveType);

  res.status(201).json({
    success: true,
    data: { leaveType },
    message: "Leave type created",
  });
});

export const updateLeaveType = asyncHandler(async (req, res) => {
  const leaveType = await findLeaveType(req.params.id);
  const before = leaveType.toJSON();

  leaveType.set(req.body);
  await leaveType.save();

  await log(req.user, "leaveType.update", "leaveType", leaveType.id, before, leaveType);

  res.json({
    success: true,
    data: { leaveType },
    message: "Leave type updated",
  });
});

export const deleteLeaveType = asyncHandler(async (req, res) => {
  const leaveType = await findLeaveType(req.params.id);

  const requestCount = await LeaveRequest.countDocuments({
    leaveTypeCode: leaveType.code,
  });
  if (requestCount > 0) {
    throw new ApiError(
      409,
      `Leave type ${leaveType.name} cannot be deleted because ${requestCount} leave request(s) use it`
    );
  }

  const before = leaveType.toJSON();
  await leaveType.deleteOne();
  await log(req.user, "leaveType.delete", "leaveType", leaveType.id, before, null);

  res.json({
    success: true,
    data: { deleted: true },
    message: "Leave type deleted",
  });
});
