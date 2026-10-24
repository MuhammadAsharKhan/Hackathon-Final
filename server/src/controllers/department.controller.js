import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { log } from "../services/auditService.js";

const findDepartment = async (departmentId) => {
  const department = await Department.findById(departmentId);
  if (!department) throw new ApiError(404, "Department not found");
  return department;
};

export const listDepartments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active === "true") filter.isActive = true;

  const departments = await Department.find(filter).sort({ name: 1 });
  res.json({ success: true, data: { departments } });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);

  await log(req.user, "department.create", "department", department.id, null, department);

  res.status(201).json({
    success: true,
    data: { department },
    message: "Department created",
  });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await findDepartment(req.params.id);
  const before = department.toJSON();

  department.set(req.body);
  await department.save();

  await log(req.user, "department.update", "department", department.id, before, department);

  res.json({
    success: true,
    data: { department },
    message: "Department updated",
  });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await findDepartment(req.params.id);

  const [employeeCount, designationCount] = await Promise.all([
    Employee.countDocuments({ departmentId: department.id }),
    Designation.countDocuments({ departmentId: department.id }),
  ]);

  if (employeeCount > 0 || designationCount > 0) {
    throw new ApiError(409, "Department is still used by employees or designations");
  }

  const before = department.toJSON();
  await department.deleteOne();
  await log(req.user, "department.delete", "department", department.id, before, null);

  res.json({ success: true, data: { deleted: true }, message: "Department deleted" });
});
