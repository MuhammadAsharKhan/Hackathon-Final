// One place that turns a browser media failure into a sentence a person can act
// on. Both the camera check-in and the meeting room read this module.

const NOUN = {
  camera: "camera",
  microphone: "microphone",
};

const SUPPORTED = {
  camera: "This browser cannot open a camera. Use a recent version of Chrome, Edge, Firefox or Safari.",
  microphone:
    "This browser cannot open a microphone. Use a recent version of Chrome, Edge, Firefox or Safari.",
};

const INSECURE = {
  camera: "The camera needs https or localhost. Open the app over https and try again.",
  microphone:
    "The microphone needs https or localhost. Open the app over https and try again.",
};

const BLOCKED = {
  camera:
    "The browser blocked the camera. Allow it from the icon in the address bar, then try again.",
  microphone:
    "The browser blocked the microphone. Allow it from the icon in the address bar, then try again.",
};

const MISSING = {
  camera: "No camera was found on this device.",
  microphone: "No microphone was found on this device.",
};

const BUSY = {
  camera: "Another app is using the camera. Close it and try again.",
  microphone: "Another app is using the microphone. Close it and try again.",
};

export const hasMediaApi = (kind = "camera") => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;
  if (kind === "camera") return typeof navigator.mediaDevices.getUserMedia === "function";
  return typeof navigator.mediaDevices.getUserMedia === "function";
};

export const isInsecureMediaContext = () =>
  typeof window !== "undefined" && window.isSecureContext === false;

// The DOMException name is the only stable thing across browsers, so the
// message text is never parsed.
export const explainMediaError = (error, kind = "camera") => {
  const safeKind = NOUN[kind] ? kind : "camera";
  const name = error?.name || "";

  if (isInsecureMediaContext()) return INSECURE[safeKind];
  if (!hasMediaApi(safeKind)) return SUPPORTED[safeKind];
  if (name === "NotAllowedError" || name === "SecurityError") return BLOCKED[safeKind];
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return MISSING[safeKind];
  if (name === "NotReadableError" || name === "TrackStartError") return BUSY[safeKind];
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return `The ${NOUN[safeKind]} could not use the requested settings. Try again.`;
  }
  if (name === "AbortError") return `The ${NOUN[safeKind]} stopped before it started. Try again.`;

  return `The ${NOUN[safeKind]} did not start. Try again.`;
};

// A short code for the state machine, so the hook never compares messages.
export const mediaErrorReason = (error, kind = "camera") => {
  const name = error?.name || "";

  if (isInsecureMediaContext()) return "insecure";
  if (!hasMediaApi(kind)) return "unsupported";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "missing";
  if (name === "NotReadableError" || name === "TrackStartError") return "busy";
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "constraints";
  }

  return "unknown";
};
