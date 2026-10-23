import { Navigate, useLocation } from "react-router-dom";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center"
      >
        <Spinner className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (user) {
    const from = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }

  return children;
}
