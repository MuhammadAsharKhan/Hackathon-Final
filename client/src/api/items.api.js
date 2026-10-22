import http from "./http";

const unwrap = (response) => response.data.data;

export const listItems = (params) =>
  http.get("/items", { params }).then(unwrap);

export const getItem = (id) => http.get(`/items/${id}`).then(unwrap);

export const createItem = (payload) =>
  http.post("/items", payload).then(unwrap);

export const updateItem = (id, payload) =>
  http.patch(`/items/${id}`, payload).then(unwrap);

export const deleteItem = (id) => http.delete(`/items/${id}`).then(unwrap);
