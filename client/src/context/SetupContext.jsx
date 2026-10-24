import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSetupStatus } from "@/api/setup.api";

const SetupContext = createContext(null);

const INITIAL_STATE = { loading: true, setupComplete: false, failed: false };

export function SetupProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const loadStatus = useCallback(async () => {
    setState(INITIAL_STATE);

    try {
      const status = await getSetupStatus();
      setState({
        loading: false,
        setupComplete: Boolean(status.setupComplete),
        failed: false,
      });
    } catch {
      setState({ loading: false, setupComplete: false, failed: true });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const markComplete = useCallback(() => {
    setState({ loading: false, setupComplete: true, failed: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, reload: loadStatus, markComplete }),
    [state, loadStatus, markComplete]
  );

  return (
    <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
  );
}

export const useSetup = () => {
  const context = useContext(SetupContext);

  if (!context) {
    throw new Error("useSetup must be used inside SetupProvider");
  }

  return context;
};
