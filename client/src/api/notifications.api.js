import http from "./http";

const unwrap = (response) => response.data.data;

export const listNotifications = (query) =>
  http.get("/notifications", { params: query }).then(unwrap);

export const getUnreadCount = () =>
  http.get("/notifications/unread-count").then(unwrap);

export const markNotificationRead = (id) =>
  http.patch(`/notifications/${id}/read`).then(unwrap);

export const markAllNotificationsRead = () =>
  http.post("/notifications/read-all").then(unwrap);
