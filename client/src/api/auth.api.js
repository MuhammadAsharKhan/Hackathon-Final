import http, { refreshSession } from "./http";

const unwrap = (response) => response.data.data;

export const login = (credentials) =>
  http.post("/auth/login", credentials).then(unwrap);

export const logout = () => http.post("/auth/logout").then(unwrap);

export const refresh = () => refreshSession();

export const getMe = () => http.get("/auth/me").then(unwrap);

export const changePassword = (passwordChange) =>
  http.post("/auth/change-password", passwordChange).then(unwrap);

export const forgotPassword = (email) =>
  http.post("/auth/forgot-password", { email }).then(unwrap);

export const verifyOtp = (verification) =>
  http.post("/auth/verify-otp", verification).then(unwrap);

export const resetPassword = (passwordReset) =>
  http.post("/auth/reset-password", passwordReset).then(unwrap);
