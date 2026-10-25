import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);

/** Counts from zero on first mount only; later updates land directly. */
function CountValue({ value, format }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (started.current || reduce || target === 0) {
      started.current = true;
      setDisplay(target);
      return undefined;
    }

    started.current = true;
    const start = performance.now();
    const duration = 700;
    let frame = 0;

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(target * easeOut(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
      else setDisplay(target);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{format ? format(display) : Math.round(display)}</>;
}

const TONES = {
  blue: "bg-blue-50 text-blue-700",
  lime: "bg-lime-50 text-lime-700",
  amber: "bg-status-amber-bg text-status-amber",
  rose: "bg-status-rose-bg text-status-rose",
  violet: "bg-status-violet-bg text-status-violet",
  slate: "bg-status-slate-bg text-status-slate",
};

/**
 * Metrics live in one continuous surface split by hairlines, never a grid of
 * identical boxes. Two rows on small screens.
 */
export default function StatStrip({ segments = [], className }) {
  if (segments.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-card bg-surface shadow-e2",
        "sm:grid-cols-3",
        segments.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        className
      )}
    >
      {segments.map((segment, index) => {
        const Icon = segment.icon;
        const tone = TONES[segment.tone] || TONES.blue;

        const body = (
          <>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {Icon ? (
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                    tone
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              ) : null}
              <p className="font-display text-[20px] font-extrabold leading-none tabular-nums text-text sm:text-[26px]">
                {segment.text !== undefined ? (
                  segment.text
                ) : (
                  <CountValue value={segment.value} format={segment.format} />
                )}
              </p>
              {segment.hint ? (
                <span className="rounded-pill bg-mist px-2 py-0.5 text-[11.5px] font-semibold text-text-2">
                  {segment.hint}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-[13.5px] text-muted">{segment.label}</p>
          </>
        );

        const shell = cn(
          "block px-5 py-5 text-left",
          // hairlines between segments, never around the surface
          index % 2 === 1 && "border-l border-line-soft",
          segments.length >= 3 && "sm:border-l sm:border-line-soft",
          index === 0 && "sm:border-l-0",
          segment.to || segment.onClick ? "hover:bg-blue-50" : ""
        );

        if (segment.to) {
          return (
            <Link key={segment.label} to={segment.to} className={shell}>
              {body}
            </Link>
          );
        }

        if (segment.onClick) {
          return (
            <button
              key={segment.label}
              type="button"
              onClick={segment.onClick}
              className={shell}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={segment.label} className={shell}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
