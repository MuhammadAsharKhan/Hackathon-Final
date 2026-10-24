import http from "./http";

const unwrap = (response) => response.data.data;

export const getLeaveBalance = (year) =>
  http.get("/leave/balance", { params: { year } }).then(unwrap);

export const previewLeave = (request) =>
  http.post("/leave/preview", request).then(unwrap);

export const applyLeave = (request) =>
  http.post("/leave/requests", request).then(unwrap);

export const listLeaveRequests = (query) =>
  http.get("/leave/requests", { params: query }).then(unwrap);

export const cancelLeave = (id) =>
  http.patch(`/leave/requests/${id}/cancel`).then(unwrap);

export const decideLeave = (id, decision) =>
  http.patch(`/leave/requests/${id}/decision`, decision).then(unwrap);
