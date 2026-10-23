import http from "./http";

const unwrap = (response) => response.data.data;

export const sendChat = (payload) =>
  http.post("/ai/chat", payload).then(unwrap);

export const listConversations = () =>
  http.get("/ai/conversations").then(unwrap);

export const getConversation = (uid) =>
  http.get(`/ai/conversations/${uid}`).then(unwrap);

export const deleteConversation = (uid) =>
  http.delete(`/ai/conversations/${uid}`).then(unwrap);

export const listAiKeys = () => http.get("/admin/ai/keys").then(unwrap);

export const createAiKey = (payload) =>
  http.post("/admin/ai/keys", payload).then(unwrap);

export const updateAiKey = (id, payload) =>
  http.patch(`/admin/ai/keys/${id}`, payload).then(unwrap);

export const deleteAiKey = (id) =>
  http.delete(`/admin/ai/keys/${id}`).then(unwrap);

export const testAiKey = (id) =>
  http.post(`/admin/ai/keys/${id}/test`).then(unwrap);

export const getAiSettings = () => http.get("/admin/ai/settings").then(unwrap);

export const updateAiSettings = (payload) =>
  http.put("/admin/ai/settings", payload).then(unwrap);
