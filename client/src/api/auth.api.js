import http, { refreshSession } from "./http";

const unwrap = (response) => response.data.data;

export const register = (payload) =>
  http.post("/auth/register", payload).then(unwrap);

export const login = (payload) => http.post("/auth/login", payload).then(unwrap);

export const refresh = () => refreshSession();

export const logout = () => http.post("/auth/logout").then(unwrap);

export const me = () => http.get("/auth/me").then(unwrap);
