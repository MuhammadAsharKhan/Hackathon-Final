import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageLoading from "@/components/ui/PageLoading";
import { useAuth } from "@/hooks/useAuth";
import { CHANGE_PASSWORD_PATH } from "@/lib/navigation";

export default function ProtectedRoute({ roles, children }) {
  const { user, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoading label="Loading your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A temporary password blocks every screen except the change form.
  if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}
