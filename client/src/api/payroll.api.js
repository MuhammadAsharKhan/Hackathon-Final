import http from "./http";

const unwrap = (response) => response.data.data;

export const listPayrollRuns = (query) =>
  http.get("/payroll/runs", { params: query }).then(unwrap);

export const getPayrollRun = (id) => http.get(`/payroll/runs/${id}`).then(unwrap);

export const createPayrollRun = (month) =>
  http.post("/payroll/runs", { month }).then(unwrap);

export const finalizePayrollRun = (id) =>
  http.post(`/payroll/runs/${id}/finalize`).then(unwrap);

export const listMyPayslips = () =>
  http.get("/payroll/payslips/me").then(unwrap);

export const getPayslip = (id) => http.get(`/payroll/payslips/${id}`).then(unwrap);
