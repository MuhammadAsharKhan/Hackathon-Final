import http from "./http";

const unwrap = (response) => response.data.data;

export const updateProfile = (payload) =>
  http.patch("/users/me", payload).then(unwrap);

export const changePassword = (payload) =>
  http.patch("/users/me/password", payload).then(unwrap);

export const listUsers = (params) =>
  http.get("/users", { params }).then(unwrap);
