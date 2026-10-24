import http from "./http";

const unwrap = (response) => response.data.data;

const remove = (path) => http.delete(path).then(unwrap);

export const listDepartments = (query) =>
  http.get("/departments", { params: query }).then(unwrap);

export const createDepartment = (department) =>
  http.post("/departments", department).then(unwrap);

export const updateDepartment = (id, updates) =>
  http.patch(`/departments/${id}`, updates).then(unwrap);

export const deleteDepartment = (id) => remove(`/departments/${id}`);

export const listDesignations = (query) =>
  http.get("/designations", { params: query }).then(unwrap);

export const createDesignation = (designation) =>
  http.post("/designations", designation).then(unwrap);

export const updateDesignation = (id, updates) =>
  http.patch(`/designations/${id}`, updates).then(unwrap);

export const deleteDesignation = (id) => remove(`/designations/${id}`);

export const listLeaveTypes = () =>
  http.get("/leave-types").then(unwrap);

export const createLeaveType = (leaveType) =>
  http.post("/leave-types", leaveType).then(unwrap);

export const updateLeaveType = (id, updates) =>
  http.patch(`/leave-types/${id}`, updates).then(unwrap);

export const deleteLeaveType = (id) => remove(`/leave-types/${id}`);

export const listHolidays = (query) =>
  http.get("/holidays", { params: query }).then(unwrap);

export const createHoliday = (holiday) =>
  http.post("/holidays", holiday).then(unwrap);

export const updateHoliday = (id, updates) =>
  http.patch(`/holidays/${id}`, updates).then(unwrap);

export const deleteHoliday = (id) => remove(`/holidays/${id}`);
