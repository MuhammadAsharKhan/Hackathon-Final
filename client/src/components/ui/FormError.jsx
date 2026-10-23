import { cn } from "@/lib/cn";

export default function FormError({ children, bordered = false, className }) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className={cn(
        "text-sm text-danger",
        bordered && "rounded-lg border border-danger px-3 py-2",
        className
      )}
    >
      {children}
    </p>
  );
}
