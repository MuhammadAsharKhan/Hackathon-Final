import { useEffect } from "react";

const APP_NAME = "HCM Lite";

export const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} - ${APP_NAME}` : APP_NAME;
  }, [title]);
};
