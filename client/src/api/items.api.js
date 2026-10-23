import http from "./http";

const unwrap = (response) => response.data.data;

export const listItems = (query) =>
  http.get("/items", { params: query }).then(unwrap);

export const createItem = (itemInput) =>
  http.post("/items", itemInput).then(unwrap);

export const updateItem = (id, updates) =>
  http.patch(`/items/${id}`, updates).then(unwrap);

export const deleteItem = (id) => http.delete(`/items/${id}`).then(unwrap);
