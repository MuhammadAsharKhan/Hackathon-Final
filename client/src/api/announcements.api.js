import http from "./http";

const unwrap = (response) => response.data.data;

export const listAnnouncements = (query) =>
  http.get("/announcements", { params: query }).then(unwrap);

export const createAnnouncement = (announcement) =>
  http.post("/announcements", announcement).then(unwrap);

export const deleteAnnouncement = (id) =>
  http.delete(`/announcements/${id}`).then(unwrap);
