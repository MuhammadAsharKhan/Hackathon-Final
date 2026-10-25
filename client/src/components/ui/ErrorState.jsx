import { AlertCircle } from "lucide-react";
import Button from "./Button";
import { cn } from "@/lib/cn";

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card bg-surface px-6 py-12 text-center shadow-e2",
        className
      )}
      {...props}
    >
      <svg width="160" height="104" viewBox="0 0 160 104" aria-hidden="true" className="mb-4">
        <rect x="8" y="10" width="96" height="16" rx="4" fill="#FFE8EE" />
        <rect x="8" y="40" width="128" height="16" rx="4" fill="#BE123C" opacity="0.28" />
        <rect x="8" y="70" width="72" height="16" rx="4" fill="#BE123C" opacity="0.16" />
      </svg>

      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-status-rose-bg text-status-rose">
        <AlertCircle className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>

      <p className="font-display text-[17px] font-bold text-text">{title}</p>
      {message ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted">{message}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
