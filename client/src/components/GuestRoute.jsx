import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageLoading from "@/components/ui/PageLoading";
import { useAuth } from "@/hooks/useAuth";
import { CHANGE_PASSWORD_PATH, redirectPath } from "@/lib/navigation";

export default function GuestRoute({ children }) {
  const { user, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoading label="Loading your session" />
      </div>
    );
  }

  if (user) {
    if (mustChangePassword) {
      return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
    }
    return <Navigate to={redirectPath(location)} replace />;
  }

  return children || <Outlet />;
}
