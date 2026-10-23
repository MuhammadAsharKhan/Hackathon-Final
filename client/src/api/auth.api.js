import http, { refreshSession } from "./http";

const unwrap = (response) => response.data.data;

export const register = (account) =>
  http.post("/auth/register", account).then(unwrap);

export const login = (credentials) =>
  http.post("/auth/login", credentials).then(unwrap);

export const signInWithGoogle = (credential) =>
  http.post("/auth/google", { credential }).then(unwrap);

export const signInWithFacebook = (accessToken) =>
  http.post("/auth/facebook", { accessToken }).then(unwrap);

export const forgotPassword = (email) =>
  http.post("/auth/forgot-password", { email }).then(unwrap);

export const verifyOtp = (verification) =>
  http.post("/auth/verify-otp", verification).then(unwrap);

export const verifyEmail = (verification) =>
  http.post("/auth/verify-email", verification).then(unwrap);

export const resendVerification = (email) =>
  http.post("/auth/resend-verification", { email }).then(unwrap);

export const resetPassword = (passwordReset) =>
  http.post("/auth/reset-password", passwordReset).then(unwrap);

export const refresh = () => refreshSession();

export const logout = () => http.post("/auth/logout").then(unwrap);
