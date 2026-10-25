import { cn } from "@/lib/cn";

/**
 * CSS only. The trigger is wrapped so the tooltip can appear above it, and it
 * shows on hover and on keyboard focus.
 */
export default function Tooltip({ label, children, className, side = "top" }) {
  if (!label) return children;

  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-small bg-ink px-2.5 py-1.5 text-[12.5px] leading-snug text-white opacity-0 shadow-e3",
          "transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        )}
      >
        {label}
      </span>
    </span>
  );
}
