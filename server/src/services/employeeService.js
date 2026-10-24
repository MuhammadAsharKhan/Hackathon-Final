import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import ApiError from "../utils/ApiError.js";

const CODE_COUNTER = "employeeCode";
const CODE_ATTEMPTS = 5;

// EMP-0001, EMP-0002, ... from one atomic increment. A code already taken by a
// hand-written import row is skipped instead of failing the request.
export const nextEmployeeCode = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: CODE_COUNTER },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `EMP-${String(counter.value).padStart(4, "0")}`;
};

// An imported employee may already hold a code the counter is about to reach,
// so the next free one is taken instead.
export const allocateEmployeeCode = async () => {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = await nextEmployeeCode();
    const codeTaken = await Employee.exists({ code });
    if (!codeTaken) return code;
  }

  throw new ApiError(500, "Could not allocate an employee code");
};

const nameOf = async (model, id) => {
  if (!id) return null;
  const document = await model.findById(id).select("name");
  return document?.name ?? null;
};

export const employeeSummaryFor = async (employeeId) => {
  if (!employeeId) return null;

  const employee = await Employee.findById(employeeId);
  if (!employee) return null;

  const [department, designation] = await Promise.all([
    nameOf(Department, employee.departmentId),
    nameOf(Designation, employee.designationId),
  ]);

  return {
    id: employee.id,
    code: employee.code,
    name: employee.name,
    department,
    designation,
    status: employee.status,
  };
};

export const employeeSummaryForUser = async (user) =>
  employeeSummaryFor(user?.employeeId);
