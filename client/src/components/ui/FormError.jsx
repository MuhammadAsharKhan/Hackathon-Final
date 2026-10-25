import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A plain message, or a rose banner with an icon that shakes once when it
 * appears. It says what happened; callers pass the fix.
 */
export default function FormError({
  children,
  bordered = false,
  className,
  ...props
}) {
  if (!children) return null;

  if (!bordered) {
    return (
      <p
        role="alert"
        className={cn("text-sm text-status-rose", className)}
        {...props}
      >
        {children}
      </p>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-control bg-status-rose-bg px-3.5 py-2.5 text-sm text-status-rose animate-shake",
        className
      )}
      {...props}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
