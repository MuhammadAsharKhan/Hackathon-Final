import http, { refreshSession } from "./http";

const unwrap = (response) => response.data.data;

export const register = (payload) =>
  http.post("/auth/register", payload).then(unwrap);

export const login = (payload) => http.post("/auth/login", payload).then(unwrap);

export const signInWithGoogle = (credential) =>
  http.post("/auth/google", { credential }).then(unwrap);

export const forgotPassword = (email) =>
  http.post("/auth/forgot-password", { email }).then(unwrap);

export const verifyOtp = (payload) =>
  http.post("/auth/verify-otp", payload).then(unwrap);

export const resetPassword = (payload) =>
  http.post("/auth/reset-password", payload).then(unwrap);

export const refresh = () => refreshSession();

export const logout = () => http.post("/auth/logout").then(unwrap);

export const me = () => http.get("/auth/me").then(unwrap);
