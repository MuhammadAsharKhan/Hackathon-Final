import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");

  return (
    <div className="max-w-lg space-y-4 py-16">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This page does not exist.
      </h1>
      <p className="text-sm text-muted-foreground">
        The link may be outdated, or the page moved.
      </p>
      <Button as={Link} to="/" variant="secondary">
        Back home
      </Button>
    </div>
  );
}
