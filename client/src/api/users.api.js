import http from "./http";

const unwrap = (response) => response.data.data;

export const updateProfile = (payload) =>
  http.patch("/users/me", payload).then(unwrap);

export const changePassword = (payload) =>
  http.patch("/users/me/password", payload).then(unwrap);

export const uploadAvatar = (file) => {
  const form = new FormData();
  form.append("avatar", file);
  return http.put("/users/me/avatar", form).then(unwrap);
};

export const deleteAvatar = () => http.delete("/users/me/avatar").then(unwrap);

export const findUserByUid = (uid) =>
  http.get(`/users/uid/${uid}`).then(unwrap);

export const listUsers = (params) =>
  http.get("/users", { params }).then(unwrap);
