import http from "./http";

const unwrap = (response) => response.data.data;

export const listAuditLogs = (query) =>
  http.get("/audit", { params: query }).then(unwrap);
