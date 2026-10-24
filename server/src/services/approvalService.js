import Employee from "../models/Employee.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

// A decision needs the employee record and the role of its login, because the
// admin may only decide requests that belong to an HR employee.
export const loadDecisionSubject = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new ApiError(404, "Employee record not found");

  const account = employee.userId
    ? await User.findById(employee.userId).select("role").lean()
    : null;

  return { employee, employeeRole: account?.role ?? "employee" };
};

export const assertCanDecide = (actor, employee, employeeRole) => {
  if (actor.role === "hr") {
    if (actor.employeeId && String(actor.employeeId) === String(employee.id)) {
      throw new ApiError(403, "You cannot decide your own request");
    }
    return;
  }

  if (actor.role === "admin") {
    if (employeeRole !== "hr") {
      throw new ApiError(403, "An admin decides requests from HR employees only");
    }
    return;
  }

  throw new ApiError(403, "Forbidden");
};
