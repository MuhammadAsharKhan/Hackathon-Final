import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export default function ChartCard({
  title,
  description,
  actions,
  empty = false,
  emptyMessage = "No data for this range.",
  height = "h-64",
  children,
  className,
}) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      <div className={cn("mt-5", height)}>
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
