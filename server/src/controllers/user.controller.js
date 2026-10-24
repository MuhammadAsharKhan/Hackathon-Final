import Employee from "../models/Employee.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createTemporaryPassword } from "../utils/temporaryPassword.js";
import { log } from "../services/auditService.js";
import {
  allocateEmployeeCode,
  assertEmailFree,
  assertReferences,
  buildWelcomeMessage,
} from "../services/employeeService.js";
import { notify } from "../services/notificationService.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createHrUser = asyncHandler(async (req, res) => {
  const { name, email, departmentId, designationId, joinDate, basicSalary, gender, phone } =
    req.body;

  await assertReferences(departmentId, designationId);
  await assertEmailFree(email);

  const temporaryPassword = createTemporaryPassword();

  const user = await User.create({
    name,
    email,
    password: temporaryPassword,
    role: "hr",
    mustChangePassword: true,
  });

  let employee;
  try {
    employee = await Employee.create({
      code: await allocateEmployeeCode(),
      name,
      email,
      phone: phone ?? "",
      gender: gender ?? null,
      departmentId,
      designationId: designationId ?? null,
      joinDate,
      status: "active",
      basicSalary,
      userId: user.id,
    });

    user.employeeId = employee.id;
    await user.save();
  } catch (error) {
    await User.deleteOne({ _id: user.id }).catch(() => {});
    throw error;
  }

  await notify({
    userId: user.id,
    type: "account",
    title: "Welcome",
    message: await buildWelcomeMessage(),
    link: "/change-password",
  });

  await log(
    req.user,
    "user.createHr",
    "user",
    user.id,
    null,
    {
      user: { name: user.name, email: user.email, role: user.role },
      employee: { code: employee.code, joinDate: employee.joinDate },
    }
  );

  res.status(201).json({
    success: true,
    data: { user, employee, temporaryPassword },
    message: "HR account created",
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page, limit } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

const findManageableUser = async (userId) => {
  const user = await User.findById(userId).select(
    "+refreshTokens +previousRefreshToken"
  );
  if (!user) throw new ApiError(404, "User not found");

  if (user.role === "admin") {
    throw new ApiError(403, "The admin account cannot be changed here");
  }

  return user;
};

export const setUserActive = asyncHandler(async (req, res) => {
  const user = await findManageableUser(req.params.id);
  const before = { isActive: user.isActive };

  user.isActive = req.body.isActive;
  if (!user.isActive) {
    user.refreshTokens = [];
    user.previousRefreshToken = null;
  }
  await user.save();

  await log(
    req.user,
    user.isActive ? "user.activate" : "user.deactivate",
    "user",
    user.id,
    before,
    { isActive: user.isActive }
  );

  res.json({
    success: true,
    data: { user },
    message: user.isActive ? "Account activated" : "Account deactivated",
  });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await findManageableUser(req.params.id);
  const temporaryPassword = createTemporaryPassword();

  user.password = temporaryPassword;
  user.mustChangePassword = true;
  user.refreshTokens = [];
  user.previousRefreshToken = null;
  await user.save();

  await log(req.user, "user.resetPassword", "user", user.id, null, {
    email: user.email,
    mustChangePassword: true,
  });

  res.json({
    success: true,
    data: { temporaryPassword },
    message: "Password reset",
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  if (!req.user.employeeId) {
    throw new ApiError(403, "This account has no employee record");
  }

  const updates = {};
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.address !== undefined) updates.address = req.body.address;

  const employee = await Employee.findByIdAndUpdate(
    req.user.employeeId,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!employee) throw new ApiError(404, "Employee record not found");

  res.json({ success: true, data: { employee }, message: "Profile updated" });
});
