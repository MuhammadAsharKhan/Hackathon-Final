export const DASHBOARD_PATH = "/dashboard";
export const CHANGE_PASSWORD_PATH = "/change-password";
export const LOGIN_PATH = "/login";

export const redirectPath = (location, fallback = DASHBOARD_PATH) => {
  const from = location?.state?.from;

  if (!from?.pathname) return fallback;

  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
};
