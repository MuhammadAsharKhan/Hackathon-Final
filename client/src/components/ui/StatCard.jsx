import { cn } from "@/lib/cn";
import Card from "./Card";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  valueClassName,
  ...props
}) {
  return (
    <Card className={cn("bg-surface-tint p-5", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight",
              valueClassName
            )}
          >
            {value}
          </p>
        </div>
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        ) : null}
      </div>
      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}
