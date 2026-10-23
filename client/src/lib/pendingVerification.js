const PENDING_EMAIL_KEY = "pendingVerificationEmail";

export const readPendingEmail = () =>
  sessionStorage.getItem(PENDING_EMAIL_KEY) || "";

export const savePendingEmail = (email) =>
  sessionStorage.setItem(PENDING_EMAIL_KEY, email);

export const clearPendingEmail = () =>
  sessionStorage.removeItem(PENDING_EMAIL_KEY);
