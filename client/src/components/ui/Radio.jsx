import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const Radio = forwardRef(function Radio(
  { label, hint, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          aria-invalid={error ? true : undefined}
          className={cn(
            "peer h-5 w-5 cursor-pointer appearance-none rounded-full border bg-surface",
            "transition-[background-color,border-color] duration-150",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/20",
            "checked:border-blue checked:bg-blue",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-status-rose" : "border-line"
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-2 w-2 scale-0 rounded-full bg-white transition-transform duration-150 peer-checked:scale-100"
        />
      </span>

      {label ? (
        <div className="min-w-0">
          <label htmlFor={inputId} className="block cursor-pointer text-sm text-text">
            {label}
          </label>
          {error ? (
            <p className="mt-1 text-xs text-status-rose">{error}</p>
          ) : hint ? (
            <p className="mt-1 text-xs text-muted">{hint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export default Radio;
