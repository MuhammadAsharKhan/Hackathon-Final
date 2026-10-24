import { Navigate, Outlet, useLocation } from "react-router-dom";
import ErrorState from "@/components/ui/ErrorState";
import PageLoading from "@/components/ui/PageLoading";
import { useSetup } from "@/context/SetupContext";
import { useAuth } from "@/hooks/useAuth";

export const SETUP_PATH = "/setup";

export default function SetupGate() {
  const { loading, setupComplete, failed, reload } = useSetup();
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoading label="Checking setup" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <ErrorState
          className="w-full"
          title="Setup status did not load"
          message="Cannot reach the server. Try again."
          onRetry={reload}
        />
      </div>
    );
  }

  if (!setupComplete && pathname !== SETUP_PATH) {
    return <Navigate to={SETUP_PATH} replace />;
  }

  // A session created by the setup request navigates away from this path, so
  // only a visitor without a session is sent to the sign-in screen.
  if (setupComplete && pathname === SETUP_PATH && !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
