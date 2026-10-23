import { cn } from "@/lib/cn";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center",
        className
      )}
      {...props}
    >
      {Icon ? (
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      ) : null}
      <h2 className="mt-4 text-sm font-medium text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
