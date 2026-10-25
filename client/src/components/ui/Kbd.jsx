import { cn } from "@/lib/cn";

export default function Kbd({ children, className, ...props }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-mist px-1.5 font-sans text-[11px] font-semibold text-text-2",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
