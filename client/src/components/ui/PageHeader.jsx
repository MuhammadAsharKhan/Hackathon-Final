import { cn } from "@/lib/cn";

export default function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-text">
          {title}
        </h1>

        {/* the mark, tiny: a blue bar and a lime square */}
        <span aria-hidden="true" className="mt-3 flex items-center gap-1">
          <span className="h-1 w-7 rounded-pill bg-blue" />
          <span className="h-1 w-1 rounded-[1px] bg-lime" />
        </span>

        {description ? (
          <p className="mt-3 max-w-[60ch] text-[15px] text-muted">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
