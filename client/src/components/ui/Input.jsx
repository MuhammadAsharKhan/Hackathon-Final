import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const Input = forwardRef(function Input(
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
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionId(inputId, error, hint)}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-danger focus:border-danger",
          className
        )}
        {...props}
      />
    </Field>
  );
});

export default Input;
