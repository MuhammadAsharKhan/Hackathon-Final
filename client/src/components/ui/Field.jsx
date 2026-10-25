import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export const fieldDescriptionId = (id, error, hint) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export default function Field({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
  ...props
}) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label ? (
        <label
          htmlFor={id}
          className="block font-display text-sm font-semibold text-text"
        >
          {label}
          {required ? (
            <span className="ml-1 text-status-rose" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-xs text-status-rose"
        >
          <AlertCircle
            className="mt-px h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
