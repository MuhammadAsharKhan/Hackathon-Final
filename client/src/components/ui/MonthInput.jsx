import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const MonthInput = forwardRef(function MonthInput(
  { label, error, hint, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <Field id={inputId} label={label} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        type="month"
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionId(inputId, error, hint)}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors duration-150 focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-danger focus:border-danger",
          className
        )}
        {...props}
      />
    </Field>
  );
});

export default MonthInput;
