import { cn } from "@/lib/cn";

export default function Divider({ children = "or", className }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
