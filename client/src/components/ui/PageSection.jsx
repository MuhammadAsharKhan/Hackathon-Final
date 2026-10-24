import { cn } from "@/lib/cn";

export default function PageSection({
  title,
  description,
  actions,
  children,
  className,
  ...props
}) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {title || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
