import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

/**
 * 44 x 26 switch. The native checkbox stays in the DOM so `checked`, `onChange`
 * and `ref` behave as before; the track and knob are drawn with peers.
 */
const Switch = forwardRef(function Switch(
  { label, hint, className, id, disabled, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative inline-flex h-[26px] w-11 shrink-0 items-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className={cn(
            "peer h-[26px] w-11 cursor-pointer appearance-none rounded-pill bg-line",
            "transition-[background-color] duration-150 ease-brand",
            "checked:bg-blue disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/20"
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-e1",
            "transition-transform duration-150 ease-brand peer-checked:translate-x-[18px]"
          )}
        />
      </span>

      {label ? (
        <div className="min-w-0">
          <label
            htmlFor={inputId}
            className="block cursor-pointer font-display text-sm font-semibold text-text"
          >
            {label}
          </label>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  );
});

export default Switch;
