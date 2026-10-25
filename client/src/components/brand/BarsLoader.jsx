import { cn } from "@/lib/cn";

/**
 * The three bars of the mark, each growing in turn, with the green square
 * blinking once per loop. Only transform and opacity animate, so it stays
 * cheap and respects prefers-reduced-motion (the CSS cuts it to 0.01ms).
 */
export default function BarsLoader({ size = 36, className, label, ...props }) {
  const barHeight = Math.max(2, Math.round(size * 0.17));
  const gap = Math.max(2, Math.round(size * 0.085));
  const square = barHeight;

  return (
    <span
      role={label ? "status" : undefined}
      className={cn("inline-flex items-start", className)}
      style={{ gap, width: size, height: size }}
      {...props}
    >
      <span
        className="flex flex-1 flex-col"
        style={{ gap, height: size }}
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="bar-motion block w-full origin-left rounded-[2px] bg-blue animate-bars-loader"
            style={{
              height: barHeight,
              animationDelay: `${index * 120}ms`,
            }}
          />
        ))}
      </span>
      <span
        className="block shrink-0 rounded-[2px] bg-lime animate-bar-blink"
        style={{ width: square, height: square }}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
