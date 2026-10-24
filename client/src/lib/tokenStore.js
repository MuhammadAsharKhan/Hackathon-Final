// The access token lives in memory, not in web storage.
let accessToken = null;

// A flag, not a credential. The refresh cookie is httpOnly, so this is the
// only hint the page has that a session is worth restoring on load.
const SESSION_HINT = "baseline.hasSession";

export const getToken = () => accessToken;

export const setToken = (token) => {
  accessToken = token;
};

export const clearToken = () => {
  accessToken = null;
};

export const hasSessionHint = () => {
  try {
    return window.localStorage.getItem(SESSION_HINT) === "1";
  } catch {
    return true;
  }
};

export const rememberSession = () => {
  try {
    window.localStorage.setItem(SESSION_HINT, "1");
  } catch {
    // Blocked storage costs one refresh call on the next load.
  }
};

export const forgetSession = () => {
  try {
    window.localStorage.removeItem(SESSION_HINT);
  } catch {
    // Nothing stored to remove.
  }
};
