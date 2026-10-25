import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

/**
 * 48px filled control. `leadingIcon` takes a lucide component and turns blue
 * while the field has focus; `trailing` takes a node for a reveal button or a
 * unit label.
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    required,
    className,
    id,
    leadingIcon: LeadingIcon,
    trailing,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <Field
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      required={required}
    >
      <div className="group relative">
        {LeadingIcon ? (
          <LeadingIcon
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2",
              error ? "text-status-rose" : "text-muted group-focus-within:text-blue"
            )}
          />
        ) : null}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescriptionId(inputId, error, hint)}
          className={cn(
            "h-12 w-full rounded-control border bg-[#F5F8FD] px-3.5 text-[15px] text-text placeholder:text-muted",
            "focus:bg-surface focus:outline-none focus:ring-4",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-status-rose bg-status-rose-bg/50 focus:border-status-rose focus:ring-status-rose/15"
              : "border-transparent hover:border-[#D3DDEE] focus:border-blue focus:ring-blue/15",
            LeadingIcon && "pl-11",
            trailing && "pr-12",
            className
          )}
          {...props}
        />

        {trailing ? (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        ) : null}
      </div>
    </Field>
  );
});

export default Input;
