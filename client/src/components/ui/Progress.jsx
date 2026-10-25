import { cn } from "@/lib/cn";

export default function Progress({
  value = 0,
  max = 100,
  label,
  hint,
  className,
  barClassName,
  ...props
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div className={cn("w-full", className)} {...props}>
      {label || hint ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? (
            <span className="text-[12.5px] font-semibold text-text">{label}</span>
          ) : null}
          {hint ? (
            <span className="text-[12.5px] tabular-nums text-muted">{hint}</span>
          ) : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || undefined}
        className={cn(
          "h-2 w-full overflow-hidden rounded-pill bg-line-soft",
          barClassName
        )}
      >
        <div
          className="h-full rounded-pill bg-brand-gradient transition-[width] duration-300 ease-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
