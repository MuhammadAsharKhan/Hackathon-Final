import { AlertCircle } from "lucide-react";
import Button from "./Button";
import { cn } from "@/lib/cn";

export default function ErrorState({
  title,
  message,
  onRetry,
  className,
  ...props
}) {
  return (
    <div
      role="alert"
      className={cn("rounded-xl border border-border p-6", className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-danger"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium">{title}</p>
          {message ? (
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          ) : null}
          {onRetry ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
