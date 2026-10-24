import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAssistant } from "@/hooks/useAssistant";
import AssistantLauncher from "./AssistantLauncher";

// The panel pulls in the markdown renderer, so it loads when first opened.
const AssistantPanel = lazy(() => import("./AssistantPanel"));

const AssistantContext = createContext(null);

// The panel lives once in the app shell, so a page only asks for it to open.
export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const assistant = useAssistant();

  const openAssistant = useCallback(() => {
    setOpen(true);
    setFocusRequest((current) => current + 1);
  }, []);

  const closeAssistant = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openAssistant, closeAssistant, assistant }),
    [openAssistant, closeAssistant, assistant]
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
      {open ? null : <AssistantLauncher onClick={openAssistant} />}
      <Suspense fallback={null}>
        <AssistantPanel
          open={open}
          onClose={closeAssistant}
          focusRequest={focusRequest}
          assistant={assistant}
        />
      </Suspense>
    </AssistantContext.Provider>
  );
}

export const useAssistantPanel = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistantPanel must be used inside AssistantProvider");
  }
  return context;
};
