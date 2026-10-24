import { parse } from "csv-parse/sync";
import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Designation from "../models/Designation.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { now } from "../utils/clock.js";
import { isValidDateString, monthBounds, todayIn } from "../utils/dates.js";
import { createTemporaryPassword } from "../utils/temporaryPassword.js";
import { loadDecisionSubject } from "./approvalService.js";
import { getEmployeeDaysForRange } from "./attendanceService.js";
import { summarizeEmployeeDays } from "./attendanceCalc.js";
import { log } from "./auditService.js";
import {
  getBalancesForEmployee,
  getRecentLeaves,
} from "./leaveService.js";
import { notify, notifyMany } from "./notificationService.js";
import { payslipsForEmployee } from "./payrollService.js";
import { getSettings } from "./settingsService.js";

const CODE_COUNTER = "employeeCode";
const CODE_ATTEMPTS = 5;
const MAX_IMPORT_ROWS = 2000;
const CSV_COLUMNS = [
  "code",
  "name",
  "email",
  "phone",
  "address",
  "gender",
  "dateOfBirth",
  "department",
  "designation",
  "joinDate",
  "status",
  "basicSalary",
];
const IMPORT_STATUSES = ["probation", "active", "exited"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = ["male", "female", "other"];
const SALARY_FIELDS = ["basicSalary", "hraPercent", "medicalPercent"];

// EMP-0001, EMP-0002, ... from one atomic increment.
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

export const findEmployeeOrFail = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new ApiError(404, "Employee not found");
  return employee;
};

export const assertReferences = async (departmentId, designationId) => {
  if (departmentId) {
    const department = await Department.findById(departmentId).select("_id");
    if (!department) throw new ApiError(422, "Department not found");
  }

  if (designationId) {
    const designation = await Designation.findById(designationId).select("_id");
    if (!designation) throw new ApiError(422, "Designation not found");
  }
};

export const assertEmailFree = async (email) => {
  const [existingUser, existingEmployee] = await Promise.all([
    User.exists({ email }),
    Employee.exists({ email }),
  ]);

  if (existingUser || existingEmployee) {
    throw new ApiError(409, "Email is already in use");
  }
};

export const buildWelcomeMessage = async () => {
  const settings = await getSettings();
  const companyName = settings?.companyName || "the company";
  return `Your account for ${companyName} is ready. Change your temporary password to continue.`;
};

const orgNameMaps = async (departmentIds, designationIds) => {
  const uniqueDepartments = [...new Set(departmentIds.filter(Boolean).map(String))];
  const uniqueDesignations = [...new Set(designationIds.filter(Boolean).map(String))];

  const [departments, designations] = await Promise.all([
    Department.find({ _id: { $in: uniqueDepartments } }).select("name").lean(),
    Designation.find({ _id: { $in: uniqueDesignations } }).select("name").lean(),
  ]);

  return {
    departments: new Map(departments.map((item) => [String(item._id), item.name])),
    designations: new Map(designations.map((item) => [String(item._id), item.name])),
  };
};

const employeeRow = (employee, maps) => ({
  id: String(employee._id ?? employee.id),
  code: employee.code,
  name: employee.name,
  email: employee.email,
  phone: employee.phone,
  address: employee.address,
  gender: employee.gender,
  dateOfBirth: employee.dateOfBirth,
  departmentId: employee.departmentId ? String(employee.departmentId) : null,
  designationId: employee.designationId ? String(employee.designationId) : null,
  department: maps.departments.get(String(employee.departmentId)) ?? null,
  designation: maps.designations.get(String(employee.designationId)) ?? null,
  joinDate: employee.joinDate,
  exitDate: employee.exitDate ?? null,
  status: employee.status,
  basicSalary: employee.basicSalary,
  hraPercent: employee.hraPercent,
  medicalPercent: employee.medicalPercent,
  createdAt: employee.createdAt,
  updatedAt: employee.updatedAt,
});

const rowsFor = async (employees) => {
  const maps = await orgNameMaps(
    employees.map((employee) => employee.departmentId),
    employees.map((employee) => employee.designationId)
  );

  return employees.map((employee) => employeeRow(employee, maps));
};

const salarySnapshot = (employee) => ({
  basicSalary: employee.basicSalary,
  hraPercent: employee.hraPercent,
  medicalPercent: employee.medicalPercent,
});

const detailSnapshot = (employee) => ({
  code: employee.code,
  name: employee.name,
  email: employee.email,
  phone: employee.phone,
  address: employee.address,
  gender: employee.gender,
  dateOfBirth: employee.dateOfBirth,
  departmentId: employee.departmentId ? String(employee.departmentId) : null,
  designationId: employee.designationId ? String(employee.designationId) : null,
  joinDate: employee.joinDate,
  exitDate: employee.exitDate ?? null,
  status: employee.status,
});

export const registerEmployee = async (actor, payload) => {
  await assertReferences(payload.departmentId, payload.designationId);
  await assertEmailFree(payload.email);

  const temporaryPassword = createTemporaryPassword();
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: temporaryPassword,
    role: "employee",
    mustChangePassword: true,
  });

  let employee;
  try {
    employee = await Employee.create({
      code: await allocateEmployeeCode(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? "",
      address: payload.address ?? "",
      gender: payload.gender ?? null,
      dateOfBirth: payload.dateOfBirth ?? null,
      departmentId: payload.departmentId,
      designationId: payload.designationId ?? null,
      joinDate: payload.joinDate,
      status: payload.status ?? "active",
      basicSalary: payload.basicSalary,
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

  await log(actor, "employee.register", "employee", employee.id, null, {
    ...detailSnapshot(employee),
    userEmail: user.email,
    role: user.role,
  });

  const [row] = await rowsFor([employee]);
  return { employee: row, temporaryPassword };
};

export const listEmployees = async (query) => {
  const filter = {};

  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const pattern = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { code: pattern }, { email: pattern }];
  }

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .sort({ code: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Employee.countDocuments(filter),
  ]);

  return {
    employees: await rowsFor(employees),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
};

export const getEmployee = async (actor, employeeId) => {
  const employee = await findEmployeeOrFail(employeeId);

  if (actor.role === "employee" && String(actor.employeeId) !== String(employee.id)) {
    throw new ApiError(403, "You can only view your own record");
  }

  const [row] = await rowsFor([employee]);
  return row;
};

export const getEmployee360 = async (
  actor,
  employeeId,
  month,
  { now: currentInstant = now() } = {}
) => {
  const employee = await findEmployeeOrFail(employeeId);

  if (actor.role === "employee" && String(actor.employeeId) !== String(employee.id)) {
    throw new ApiError(403, "You can only view your own record");
  }

  const settings = await getSettings();
  const monthValue =
    month ?? todayIn(settings?.timezone, currentInstant).slice(0, 7);
  const { start, end } = monthBounds(monthValue);

  const [daysByEmployee, leaveBalances, recentLeaves, rows, payslips] =
    await Promise.all([
      getEmployeeDaysForRange([String(employee.id)], start, end, {
        now: currentInstant,
      }),
      getBalancesForEmployee(employee.id, undefined, currentInstant),
      getRecentLeaves(employee.id),
      rowsFor([employee]),
      payslipsForEmployee(employee.id),
    ]);

  const days = daysByEmployee.get(String(employee.id)) ?? [];

  return {
    profile: rows[0],
    attendance: {
      month: monthValue,
      summary: summarizeEmployeeDays(days),
      days,
    },
    leaveBalances: leaveBalances.balances,
    recentLeaves,
    payslips,
  };
};

const assertEmailChangeAllowed = async (employee, email) => {
  if (!email || email === employee.email) return;

  const [userWithEmail, employeeWithEmail] = await Promise.all([
    User.exists({ email, _id: { $ne: employee.userId } }),
    Employee.exists({ email, _id: { $ne: employee.id } }),
  ]);

  if (userWithEmail || employeeWithEmail) {
    throw new ApiError(409, "Email is already in use");
  }
};

export const updateEmployee = async (actor, employeeId, payload) => {
  const employee = await findEmployeeOrFail(employeeId);
  const before = detailSnapshot(employee);

  if (payload.departmentId !== undefined || payload.designationId !== undefined) {
    await assertReferences(
      payload.departmentId ?? employee.departmentId,
      payload.designationId ?? employee.designationId
    );
  }
  if (payload.email !== undefined) {
    await assertEmailChangeAllowed(employee, payload.email);
  }

  const editable = [
    "name",
    "email",
    "phone",
    "address",
    "gender",
    "dateOfBirth",
    "departmentId",
    "designationId",
    "joinDate",
    "status",
  ];
  for (const field of editable) {
    if (payload[field] !== undefined) employee[field] = payload[field];
  }

  if (payload.exitDate !== undefined) {
    if (payload.exitDate === null) {
      employee.exitDate = null;
      if (employee.status === "exited") employee.status = "active";
      if (employee.userId) {
        await User.updateOne({ _id: employee.userId }, { $set: { isActive: true } });
      }
    } else {
      employee.exitDate = payload.exitDate;
      employee.status = "exited";
      if (employee.userId) {
        await User.updateOne(
          { _id: employee.userId },
          {
            $set: {
              isActive: false,
              refreshTokens: [],
              previousRefreshToken: null,
            },
          }
        );
      }
    }
  }

  await employee.save();

  if (payload.email !== undefined && employee.userId) {
    await User.updateOne({ _id: employee.userId }, { $set: { email: employee.email } });
  }

  await log(
    actor,
    "employee.update",
    "employee",
    employee.id,
    before,
    detailSnapshot(employee)
  );

  const [row] = await rowsFor([employee]);
  return row;
};

export const updateSalary = async (actor, employeeId, payload) => {
  const employee = await findEmployeeOrFail(employeeId);

  if (actor.role === "hr") {
    if (actor.employeeId && String(actor.employeeId) === String(employee.id)) {
      throw new ApiError(403, "You cannot change your own salary");
    }
  } else if (actor.role === "admin") {
    const { employeeRole } = await loadDecisionSubject(employee.id);
    if (employeeRole !== "hr") {
      throw new ApiError(403, "An admin can change the salary of HR employees only");
    }
  } else {
    throw new ApiError(403, "Forbidden");
  }

  const before = salarySnapshot(employee);

  for (const field of SALARY_FIELDS) {
    if (payload[field] !== undefined) employee[field] = payload[field];
  }
  await employee.save();

  await log(
    actor,
    "employee.salaryUpdate",
    "employee",
    employee.id,
    before,
    salarySnapshot(employee)
  );

  const [row] = await rowsFor([employee]);
  return row;
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const employeesToCsv = (rows) =>
  [
    CSV_COLUMNS.join(","),
    ...rows.map((row) => CSV_COLUMNS.map((column) => csvCell(row[column])).join(",")),
  ].join("\n") + "\n";

export const importTemplateCsv = () => `${CSV_COLUMNS.join(",")}\n`;

export const exportEmployeesCsv = async () => {
  const employees = await Employee.find().sort({ code: 1 });
  return employeesToCsv(await rowsFor(employees));
};

const readRowValue = (record, key) =>
  typeof record[key] === "string" ? record[key].trim() : record[key] ?? "";

const validateImportRow = (record, context) => {
  const errors = [];
  const row = context.rowNumber;

  const addError = (field, reason) => errors.push({ row, field, reason });

  const code = String(readRowValue(record, "code"));
  const name = String(readRowValue(record, "name"));
  const email = String(readRowValue(record, "email")).toLowerCase();
  const phone = String(readRowValue(record, "phone"));
  const address = String(readRowValue(record, "address"));
  const gender = String(readRowValue(record, "gender")).toLowerCase();
  const dateOfBirth = String(readRowValue(record, "dateOfBirth"));
  const departmentName = String(readRowValue(record, "department"));
  const designationName = String(readRowValue(record, "designation"));
  const joinDate = String(readRowValue(record, "joinDate"));
  const status = String(readRowValue(record, "status")).toLowerCase() || "active";
  const salaryText = String(readRowValue(record, "basicSalary"));

  if (!code) addError("code", "Code is required");
  else if (context.seenCodes.has(code)) {
    addError("code", `Code ${code} appears more than once in this file`);
  } else if (context.existingCodes.has(code)) {
    addError("code", `Code ${code} already exists`);
  }

  if (!name) addError("name", "Name is required");
  else if (name.length < 2) addError("name", "Name must be at least 2 characters");

  if (!email) addError("email", "Email is required");
  else if (!EMAIL_PATTERN.test(email)) addError("email", "Email is not valid");
  else if (context.seenEmails.has(email)) {
    addError("email", `Email ${email} appears more than once in this file`);
  } else if (context.existingEmails.has(email)) {
    addError("email", `Email ${email} already exists`);
  }

  if (!departmentName) addError("department", "Department is required");
  else if (!context.departments.has(departmentName.toLowerCase())) {
    addError("department", `Unknown department ${departmentName}`);
  }

  if (designationName && !context.designations.has(designationName.toLowerCase())) {
    addError("designation", `Unknown designation ${designationName}`);
  }

  if (!joinDate) addError("joinDate", "Join date is required");
  else if (!isValidDateString(joinDate)) {
    addError("joinDate", "Join date must be a valid YYYY-MM-DD date");
  }

  if (dateOfBirth && !isValidDateString(dateOfBirth)) {
    addError("dateOfBirth", "Date of birth must be a valid YYYY-MM-DD date");
  }

  if (gender && !GENDERS.includes(gender)) {
    addError("gender", "Gender must be male, female or other");
  }

  if (!IMPORT_STATUSES.includes(status)) {
    addError("status", "Status must be probation, active or exited");
  }

  const basicSalary = Number(salaryText);
  if (!salaryText) addError("basicSalary", "Basic salary is required");
  else if (Number.isNaN(basicSalary)) {
    addError("basicSalary", "Basic salary must be a number");
  } else if (basicSalary <= 0) {
    addError("basicSalary", "Basic salary must be greater than 0");
  }

  if (phone.length > 30) addError("phone", "Phone is too long");
  if (address.length > 300) addError("address", "Address is too long");

  if (code) context.seenCodes.add(code);
  if (email) context.seenEmails.add(email);

  return {
    errors,
    values: {
      code,
      name,
      email,
      phone,
      address,
      gender: gender || null,
      dateOfBirth: dateOfBirth || null,
      departmentId: context.departments.get(departmentName.toLowerCase()) ?? null,
      designationId: designationName
        ? context.designations.get(designationName.toLowerCase()) ?? null
        : null,
      joinDate,
      status,
      basicSalary,
    },
  };
};

const buildImportContext = async (records) => {
  const codes = records.map((record) => String(readRowValue(record, "code"))).filter(Boolean);
  const emails = records
    .map((record) => String(readRowValue(record, "email")).toLowerCase())
    .filter(Boolean);

  const [existingEmployees, existingUsers, departments, designations] = await Promise.all([
    Employee.find({ $or: [{ code: { $in: codes } }, { email: { $in: emails } }] })
      .select("code email")
      .lean(),
    User.find({ email: { $in: emails } }).select("email").lean(),
    Department.find().select("name").lean(),
    Designation.find().select("name").lean(),
  ]);

  return {
    existingCodes: new Set(existingEmployees.map((employee) => employee.code)),
    existingEmails: new Set([
      ...existingEmployees.map((employee) => employee.email),
      ...existingUsers.map((user) => user.email),
    ]),
    departments: new Map(departments.map((item) => [item.name.toLowerCase(), String(item._id)])),
    designations: new Map(
      designations.map((item) => [item.name.toLowerCase(), String(item._id)])
    ),
    seenCodes: new Set(),
    seenEmails: new Set(),
  };
};

export const importEmployees = async (actor, { buffer, dryRun }) => {
  let records;
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch {
    throw new ApiError(400, "The file could not be read as CSV");
  }

  if (records.length > MAX_IMPORT_ROWS) {
    throw new ApiError(422, `A file may hold at most ${MAX_IMPORT_ROWS} rows`, [
      { field: "file", message: `A file may hold at most ${MAX_IMPORT_ROWS} rows` },
    ]);
  }

  const context = await buildImportContext(records);
  const errors = [];
  const valid = [];

  records.forEach((record, index) => {
    const result = validateImportRow(record, { ...context, rowNumber: index + 2 });
    errors.push(...result.errors);
    if (result.errors.length === 0) valid.push(result.values);
  });

  const report = {
    totalRows: records.length,
    validRows: valid.length,
    errors,
  };

  if (dryRun || errors.length > 0) {
    return { report, created: [] };
  }

  const created = [];
  const welcomeMessages = [];

  for (const values of valid) {
    const temporaryPassword = createTemporaryPassword();
    const user = await User.create({
      name: values.name,
      email: values.email,
      password: temporaryPassword,
      role: "employee",
      mustChangePassword: true,
    });

    const employee = await Employee.create({
      code: values.code,
      name: values.name,
      email: values.email,
      phone: values.phone,
      address: values.address,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth,
      departmentId: values.departmentId,
      designationId: values.designationId,
      joinDate: values.joinDate,
      status: values.status,
      basicSalary: values.basicSalary,
      userId: user.id,
    });

    user.employeeId = employee.id;
    await user.save();

    created.push({
      code: employee.code,
      name: employee.name,
      email: employee.email,
      temporaryPassword,
    });
    welcomeMessages.push({
      userId: user.id,
      type: "account",
      title: "Welcome",
      message: await buildWelcomeMessage(),
      link: "/change-password",
    });
  }

  await notifyMany(welcomeMessages);
  await log(actor, "employee.import", "employee", "", null, {
    totalRows: report.totalRows,
    created: created.length,
  });

  return { report, created };
};
