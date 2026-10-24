import http from "./http";

const unwrap = (response) => response.data.data;

export const getSetupStatus = () => http.get("/setup/status").then(unwrap);

export const completeSetup = (companySetup) =>
  http.post("/setup", companySetup).then(unwrap);
