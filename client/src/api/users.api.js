import http from "./http";

const unwrap = (response) => response.data.data;

export const listUsers = (query) =>
  http.get("/users", { params: query }).then(unwrap);

export const createHrUser = (hrInput) =>
  http.post("/users/hr", hrInput).then(unwrap);

export const setUserActive = (id, isActive) =>
  http.patch(`/users/${id}/active`, { isActive }).then(unwrap);

export const resetUserPassword = (id) =>
  http.post(`/users/${id}/reset-password`).then(unwrap);
