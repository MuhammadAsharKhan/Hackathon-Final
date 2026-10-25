import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import BarsLoader from "../brand/BarsLoader";

// Only transform and box-shadow transition; colours change instantly, which is
// what the motion rules allow.
const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-control font-display font-semibold " +
  "transition-[transform,box-shadow] duration-150 ease-brand " +
  "disabled:pointer-events-none disabled:opacity-[0.45] disabled:shadow-none";

const variants = {
  primary:
    "bg-brand-gradient text-white shadow-[0_8px_18px_-6px_rgba(28,116,239,0.6),inset_0_1px_0_rgba(255,255,255,0.28)] " +
    "hover:-translate-y-px hover:brightness-105 hover:shadow-[0_14px_26px_-8px_rgba(28,116,239,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] " +
    "active:translate-y-0 active:scale-[0.985]",
  secondary:
    "border border-line bg-surface text-text shadow-e1 " +
    "hover:border-blue-400/60 hover:bg-blue-50 active:scale-[0.985]",
  ghost:
    "bg-transparent text-text-2 hover:bg-blue-50 hover:text-text active:scale-[0.985]",
  danger:
    "bg-status-rose-bg text-status-rose hover:bg-[#FFD6E1] active:scale-[0.985]",
  success:
    "bg-lime-gradient text-ink shadow-e1 hover:-translate-y-px hover:brightness-105 hover:shadow-e2 active:translate-y-0 active:scale-[0.985]",
};

const sizes = {
  sm: "h-9 px-4 text-[13.5px]",
  md: "h-11 px-5 text-[14.5px]",
  lg: "h-[52px] px-6 text-[15px]",
  icon: "h-10 w-10 px-0",
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
        base,
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? <BarsLoader size={16} /> : null}
      {children}
    </Component>
  );
});

export default Button;
