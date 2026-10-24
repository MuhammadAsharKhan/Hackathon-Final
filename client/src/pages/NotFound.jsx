import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DASHBOARD_PATH, LOGIN_PATH } from "@/lib/navigation";

export default function NotFound() {
  useDocumentTitle("Page not found");

  const { user } = useAuth();

  return (
    <div className="max-w-lg space-y-4 py-16">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This page does not exist.
      </h1>
      <p className="text-sm text-muted-foreground">
        The link may be outdated, or the page moved.
      </p>
      <Button
        as={Link}
        to={user ? DASHBOARD_PATH : LOGIN_PATH}
        variant="secondary"
      >
        {user ? "Back to dashboard" : "Go to sign in"}
      </Button>
    </div>
  );
}
