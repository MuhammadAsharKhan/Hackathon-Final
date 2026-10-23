import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import Spinner from "./Spinner";

const variants = {
  primary: "border border-primary bg-primary text-primary-foreground hover:opacity-90",
  secondary:
    "border border-border bg-background text-foreground hover:bg-surface",
  ghost: "border border-transparent bg-transparent text-foreground hover:bg-muted",
  danger: "border border-danger bg-danger text-white hover:opacity-90",
};

const sizes = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

const Button = forwardRef(function Button(
  {
    as: Component = "button",
    className,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    type = "button",
    children,
    ...props
  },
  ref
) {
  const isButton = Component === "button";

  return (
    <Component
      ref={ref}
      {...(isButton ? { type, disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-lg font-medium transition duration-150 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </Component>
  );
});

export default Button;
