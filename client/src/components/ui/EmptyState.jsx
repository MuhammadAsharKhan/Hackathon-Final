import { cn } from "@/lib/cn";

/** Inline art built from the brand bars: drawn, not decorative wallpaper. */
function BarArt({ tone = "blue" }) {
  const main = tone === "rose" ? "#BE123C" : "#1C74EF";
  const faint = tone === "rose" ? "#FFE8EE" : "#E6F0FF";

  return (
    <svg
      width="160"
      height="104"
      viewBox="0 0 160 104"
      aria-hidden="true"
      className="mb-4"
    >
      <rect x="8" y="10" width="96" height="16" rx="4" fill={faint} />
      <rect x="8" y="40" width="128" height="16" rx="4" fill={main} opacity="0.28" />
      <rect x="8" y="70" width="72" height="16" rx="4" fill={main} opacity="0.16" />
      <rect x="112" y="40" width="16" height="16" rx="4" fill="#88C443" opacity="0.75" />
    </svg>
  );
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "blue",
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
      {...props}
    >
      <BarArt tone={tone} />

      {Icon ? (
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-blue-50 text-blue-700">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      ) : null}

      <h2 className="font-display text-[17px] font-bold text-text">{title}</h2>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
