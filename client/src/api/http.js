import axios from "axios";
import { clearToken, getToken, setToken } from "@/lib/tokenStore";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];
const isAuthPath = (url = "") =>
  AUTH_PATHS.some((path) => url.includes(path));

let refreshPromise = null;

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = http
      .post("/auth/refresh")
      .then((response) => {
        const session = response.data.data;
        setToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (status !== 401 || !config || config._retry || isAuthPath(config.url)) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      const session = await refreshSession();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${session.accessToken}`;
      return http(config);
    } catch (refreshError) {
      clearToken();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    }
  }
);

export default http;
