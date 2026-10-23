import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, id, rows = 4, ...props },
  ref
) {
  const autoId = useId();
  const textareaId = id || autoId;

  return (
    <Field id={textareaId} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescriptionId(textareaId, error, hint)}
        className={cn(
          "w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-danger focus:border-danger",
          className
        )}
        {...props}
      />
    </Field>
  );
});

export default Textarea;
