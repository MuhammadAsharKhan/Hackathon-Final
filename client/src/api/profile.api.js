import http from "./http";

const unwrap = (response) => response.data.data;

export const updateMyProfile = (profileUpdates) =>
  http.patch("/me/profile", profileUpdates).then(unwrap);

// Contact details come from the employee record. The route belongs to the
// people module, so a missing route is reported to the page instead of thrown.
export const getEmployeeProfile = (employeeId) =>
  http.get(`/employees/${employeeId}`).then(unwrap);
