import http from "./http";

const unwrap = (response) => response.data.data;

export const getToday = () => http.get("/attendance/today").then(unwrap);

export const checkIn = (body = {}) =>
  http.post("/attendance/check-in", body).then(unwrap);

export const checkOut = (body = {}) =>
  http.post("/attendance/check-out", body).then(unwrap);

export const getMyMonth = (month) =>
  http.get("/attendance/me", { params: { month } }).then(unwrap);

export const getEmployeeMonth = (employeeId, month) =>
  http
    .get(`/attendance/employee/${employeeId}`, { params: { month } })
    .then(unwrap);

export const getBoard = (query) =>
  http.get("/attendance/board", { params: query }).then(unwrap);

export const createCorrection = (correction) =>
  http.post("/attendance/corrections", correction).then(unwrap);

export const listCorrections = (query) =>
  http.get("/attendance/corrections", { params: query }).then(unwrap);

export const decideCorrection = (id, decision) =>
  http.patch(`/attendance/corrections/${id}`, decision).then(unwrap);
