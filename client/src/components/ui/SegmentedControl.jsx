import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Used for filters such as Pending, Approved, Rejected, All. The active segment
 * is one white pill that slides, so the eye follows a single element.
 */
export default function SegmentedControl({
  options = [],
  value,
  onChange,
  label = "Filter",
  className,
  ...props
}) {
  const trackRef = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const active = track.querySelector('[aria-checked="true"]');
    if (!active) return;

    setPill({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, options.length]);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "no-scrollbar relative inline-flex max-w-full overflow-x-auto rounded-[14px] bg-[#EAF0F9] p-1",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 top-1 rounded-[10px] bg-surface shadow-e1 transition-[transform,width] duration-200 ease-brand"
        style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
      />

      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 shrink-0 rounded-[10px] px-3.5 py-1.5 font-display text-[13.5px] font-semibold",
              active ? "text-text" : "text-text-2 hover:text-text"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
