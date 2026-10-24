import http from "./http";

const unwrap = (response) => response.data.data;

export const getAdminDashboard = (filters) =>
  http.get("/dashboard/admin", { params: filters }).then(unwrap);

export const getHrDashboard = (filters) =>
  http.get("/dashboard/hr", { params: filters }).then(unwrap);

export const getMyDashboard = () => http.get("/dashboard/me").then(unwrap);
