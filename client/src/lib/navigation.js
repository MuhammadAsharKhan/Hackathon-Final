export const redirectPath = (location, fallback = "/dashboard") => {
  const from = location?.state?.from;

  if (!from?.pathname) return fallback;

  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
};
