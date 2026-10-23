import axios from "axios";
import { clearToken, getToken, setToken } from "@/lib/tokenStore";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

http.interceptors.request.use((requestConfig) => {
  const token = getToken();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
];

const shouldSkipRefresh = (url = "") =>
  NO_REFRESH_PATHS.some((path) => url.includes(path));

let refreshPromise = null;

// Only one refresh runs at a time. Other 401 responses wait for its result.
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

const retryWithFreshToken = async (config) => {
  config.retried = true;
  const session = await refreshSession();
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${session.accessToken}`;
  return http(config);
};

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !config ||
      config.retried ||
      shouldSkipRefresh(config.url)
    ) {
      return Promise.reject(error);
    }

    try {
      return await retryWithFreshToken(config);
    } catch (refreshError) {
      clearToken();
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    }
  }
);

export default http;
