import http from "./http";

const unwrap = (response) => response.data.data;

export const updateProfile = (profileUpdates) =>
  http.patch("/users/me", profileUpdates).then(unwrap);

export const changePassword = (passwordChange) =>
  http.patch("/users/me/password", passwordChange).then(unwrap);

export const uploadAvatar = (file) => {
  const form = new FormData();
  form.append("avatar", file);
  return http.put("/users/me/avatar", form).then(unwrap);
};

export const deleteAvatar = () => http.delete("/users/me/avatar").then(unwrap);

export const findUserByUid = (uid) =>
  http.get(`/users/uid/${uid}`).then(unwrap);

export const listUsers = (query) =>
  http.get("/users", { params: query }).then(unwrap);
