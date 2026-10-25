import { cn } from "@/lib/cn";

export default function Divider({ className, label, ...props }) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)} {...props}>
        <span className="h-px flex-1 bg-line-soft" />
        <span className="text-[12.5px] text-muted">{label}</span>
        <span className="h-px flex-1 bg-line-soft" />
      </div>
    );
  }

  return (
    <hr
      className={cn("h-px w-full border-0 bg-line-soft", className)}
      {...props}
    />
  );
}
