import { useEffect } from "react";

const APP_NAME = "S.M.I.T-Lite";

export const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} - ${APP_NAME}` : APP_NAME;
  }, [title]);
};
