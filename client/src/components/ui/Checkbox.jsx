import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const Checkbox = forwardRef(function Checkbox(
  { label, error, hint, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        aria-invalid={error ? true : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      />
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm text-foreground">
          {label}
        </label>
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
});

export default Checkbox;
