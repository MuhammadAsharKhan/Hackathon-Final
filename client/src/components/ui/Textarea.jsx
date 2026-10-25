import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, id, rows = 4, ...props },
  ref
) {
  const autoId = useId();
  const textareaId = id || autoId;

  return (
    <Field
      id={textareaId}
      label={label}
      error={error}
      hint={hint}
      required={required}
    >
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionId(textareaId, error, hint)}
        className={cn(
          "w-full resize-y rounded-control border bg-[#F5F8FD] px-3.5 py-3 text-[15px] text-text placeholder:text-muted",
          "focus:bg-surface focus:outline-none focus:ring-4",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error
            ? "border-status-rose bg-status-rose-bg/50 focus:border-status-rose focus:ring-status-rose/15"
            : "border-transparent hover:border-[#D3DDEE] focus:border-blue focus:ring-blue/15",
          className
        )}
        {...props}
      />
    </Field>
  );
});

export default Textarea;
