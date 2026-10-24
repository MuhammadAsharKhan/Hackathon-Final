import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "../services/auditService.js";

const findDesignation = async (designationId) => {
  const designation = await Designation.findById(designationId);
  if (!designation) throw new ApiError(404, "Designation not found");
  return designation;
};

const ensureDepartmentExists = async (departmentId) => {
  if (!departmentId) return;
  const department = await Department.findById(departmentId).select("_id");
  if (!department) throw new ApiError(422, "Department not found");
};

export const listDesignations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.departmentId) filter.departmentId = req.query.departmentId;

  const designations = await Designation.find(filter).sort({ name: 1 });
  res.json({ success: true, data: { designations } });
});

export const createDesignation = asyncHandler(async (req, res) => {
  await ensureDepartmentExists(req.body.departmentId);

  const designation = await Designation.create({
    name: req.body.name,
    departmentId: req.body.departmentId ?? null,
  });

  await log(
    req.user,
    "designation.create",
    "designation",
    designation.id,
    null,
    designation
  );

  res.status(201).json({
    success: true,
    data: { designation },
    message: "Designation created",
  });
});

export const updateDesignation = asyncHandler(async (req, res) => {
  const designation = await findDesignation(req.params.id);
  await ensureDepartmentExists(req.body.departmentId);

  const before = designation.toJSON();
  designation.set(req.body);
  await designation.save();

  await log(
    req.user,
    "designation.update",
    "designation",
    designation.id,
    before,
    designation
  );

  res.json({
    success: true,
    data: { designation },
    message: "Designation updated",
  });
});

export const deleteDesignation = asyncHandler(async (req, res) => {
  const designation = await findDesignation(req.params.id);

  const employeeCount = await Employee.countDocuments({
    designationId: designation.id,
  });
  if (employeeCount > 0) {
    throw new ApiError(409, "Designation is still used by employees");
  }

  const before = designation.toJSON();
  await designation.deleteOne();
  await log(
    req.user,
    "designation.delete",
    "designation",
    designation.id,
    before,
    null
  );

  res.json({
    success: true,
    data: { deleted: true },
    message: "Designation deleted",
  });
});
