import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-lg space-y-4 py-16">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This page does not exist.
      </h1>
      <p className="text-sm text-muted-foreground">
        The link may be outdated, or the page moved.
      </p>
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface"
      >
        Back home
      </Link>
    </div>
  );
}
