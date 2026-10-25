import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

/**
 * Password field: same 48px control as Input, a reveal toggle with an
 * accessible name, and a caps lock warning while the key state says so.
 */
const PasswordInput = forwardRef(function PasswordInput(
  {
    label,
    error,
    hint,
    required,
    className,
    id,
    leadingIcon: LeadingIcon = Lock,
    onKeyUp,
    onKeyDown,
    hideIcon = false,
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const readCapsLock = (event) => {
    if (typeof event.getModifierState === "function") {
      setCapsLock(event.getModifierState("CapsLock"));
    }
  };

  return (
    <Field
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      required={required}
    >
      <div className="group relative">
        {hideIcon ? null : (
          <LeadingIcon
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2",
              error
                ? "text-status-rose"
                : "text-muted group-focus-within:text-blue"
            )}
          />
        )}

        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescriptionId(inputId, error, hint)}
          onKeyUp={(event) => {
            readCapsLock(event);
            onKeyUp?.(event);
          }}
          onKeyDown={(event) => {
            readCapsLock(event);
            onKeyDown?.(event);
          }}
          onBlur={(event) => {
            setCapsLock(false);
            props.onBlur?.(event);
          }}
          className={cn(
            "h-12 w-full rounded-control border bg-[#F5F8FD] py-0 pr-12 text-[15px] text-text placeholder:text-muted",
            "focus:bg-surface focus:outline-none focus:ring-4",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-status-rose bg-status-rose-bg/50 focus:border-status-rose focus:ring-status-rose/15"
              : "border-transparent hover:border-[#D3DDEE] focus:border-blue focus:ring-blue/15",
            hideIcon ? "pl-3.5" : "pl-11",
            className
          )}
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-small text-muted hover:bg-blue-50 hover:text-blue-700 focus-visible:text-blue-700"
        >
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>

      {capsLock ? (
        <p aria-live="polite" className="text-xs text-status-amber">
          Caps lock is on.
        </p>
      ) : null}
    </Field>
  );
});

export default PasswordInput;
