import http from "./http";
import { filenameFromDisposition } from "@/lib/download";

const unwrap = (response) => response.data.data;

const download = (path, fallbackName) =>
  http.get(path, { responseType: "blob" }).then((response) => ({
    blob: response.data,
    filename: filenameFromDisposition(
      response.headers["content-disposition"],
      fallbackName
    ),
  }));

export const listEmployees = (query) =>
  http.get("/employees", { params: query }).then(unwrap);

export const getEmployee = (id) => http.get(`/employees/${id}`).then(unwrap);

export const getEmployeeOverview = (id, month) =>
  http.get(`/employees/${id}/360`, { params: { month } }).then(unwrap);

export const registerEmployee = (employee) =>
  http.post("/employees", employee).then(unwrap);

export const updateEmployee = (id, updates) =>
  http.patch(`/employees/${id}`, updates).then(unwrap);

export const updateEmployeeSalary = (id, salary) =>
  http.patch(`/employees/${id}/salary`, salary).then(unwrap);

export const importEmployees = (file, dryRun) => {
  const form = new FormData();
  form.append("file", file);

  return http
    .post("/employees/import", form, { params: { dryRun: String(dryRun) } })
    .then(unwrap);
};

export const exportEmployees = () => download("/employees/export", "employees.csv");

export const downloadImportTemplate = () =>
  download("/employees/import/template", "employees-import-template.csv");
