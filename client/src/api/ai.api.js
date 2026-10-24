import http from "./http";

const unwrap = (response) => response.data.data;

export const smartLeave = (message) =>
  http.post("/ai/smart-leave", { message }).then(unwrap);

export const chatWithAssistant = (message, conversationId) =>
  http.post("/ai/chat", { message, conversationId }).then(unwrap);

export const getConversation = (id) =>
  http.get(`/ai/conversations/${id}`).then(unwrap);

export const dashboardSummary = (filters) =>
  http.post("/ai/dashboard-summary", filters).then(unwrap);

export const listAiKeys = () => http.get("/admin/ai/keys").then(unwrap);

export const createAiKey = (keyInput) =>
  http.post("/admin/ai/keys", keyInput).then(unwrap);

export const updateAiKey = (id, updates) =>
  http.patch(`/admin/ai/keys/${id}`, updates).then(unwrap);

export const deleteAiKey = (id) =>
  http.delete(`/admin/ai/keys/${id}`).then(unwrap);

export const testAiKey = (id) =>
  http.post(`/admin/ai/keys/${id}/test`).then(unwrap);

export const getAiSettings = () => http.get("/admin/ai/settings").then(unwrap);

export const updateAiSettings = (settingsUpdates) =>
  http.put("/admin/ai/settings", settingsUpdates).then(unwrap);
