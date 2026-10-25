import { forwardRef, useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const Checkbox = forwardRef(function Checkbox(
  { label, error, hint, className, id, ...props },
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
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className={cn(
            "peer h-5 w-5 cursor-pointer appearance-none rounded-[6px] border bg-surface",
            "transition-[background-color,border-color] duration-150",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/20",
            "checked:border-blue checked:bg-brand-gradient",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-status-rose" : "border-line"
          )}
          {...props}
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 scale-90 text-white opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
          aria-hidden="true"
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

export default Checkbox;
