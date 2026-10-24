import http from "./http";

const unwrap = (response) => response.data.data;

export const getSettings = () => http.get("/settings").then(unwrap);

export const updateSettings = (settingsUpdates) =>
  http.patch("/settings", settingsUpdates).then(unwrap);
