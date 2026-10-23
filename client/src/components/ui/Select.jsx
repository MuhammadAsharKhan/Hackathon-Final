import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const Select = forwardRef(function Select(
  { label, error, hint, className, id, children, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <Field id={selectId} label={label} error={error} hint={hint}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescriptionId(selectId, error, hint)}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm text-foreground transition-colors duration-150 focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60",
            error && "border-danger focus:border-danger",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </Field>
  );
});

export default Select;
