import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  exportEmployeesCsv,
  getEmployee,
  getEmployee360,
  importEmployees as importEmployeesFromCsv,
  importTemplateCsv,
  listEmployees as listEmployeeRows,
  registerEmployee as registerEmployeeRow,
  updateEmployee as updateEmployeeRow,
  updateSalary as updateSalaryRow,
} from "../services/employeeService.js";

export const registerEmployee = asyncHandler(async (req, res) => {
  const result = await registerEmployeeRow(req.user, req.body);

  res.status(201).json({
    success: true,
    data: result,
    message: "Employee created",
  });
});

export const listEmployees = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listEmployeeRows(req.query) });
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { employee: await getEmployee(req.user, req.params.id) },
  });
});

export const getEmployeeProfile360 = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getEmployee360(req.user, req.params.id, req.query.month),
  });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { employee: await updateEmployeeRow(req.user, req.params.id, req.body) },
    message: "Employee updated",
  });
});

export const updateEmployeeSalary = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { employee: await updateSalaryRow(req.user, req.params.id, req.body) },
    message: "Salary updated",
  });
});

export const importEmployees = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Attach a CSV file in the file field");

  const dryRun = req.query.dryRun === "true";
  const { report, created } = await importEmployeesFromCsv(req.user, {
    buffer: req.file.buffer,
    dryRun,
  });

  if (dryRun) {
    res.json({ success: true, data: report });
    return;
  }

  if (report.errors.length > 0) {
    res.status(422).json({
      success: false,
      message: "Import rejected because some rows have errors",
      errors: report.errors.map((error) => ({
        field: `row ${error.row} ${error.field}`,
        message: error.reason,
      })),
      data: report,
    });
    return;
  }

  res.status(201).json({
    success: true,
    data: { ...report, created },
    message: `${created.length} employees imported`,
  });
});

export const exportEmployees = asyncHandler(async (req, res) => {
  const csv = await exportEmployeesCsv();

  res.type("text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
  res.send(csv);
});

export const downloadImportTemplate = asyncHandler(async (req, res) => {
  res.type("text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="employees-import-template.csv"'
  );
  res.send(importTemplateCsv());
});
