import { cn } from "@/lib/cn";

/** Space reserved while data loads. The shimmer sweeps with a transform. */
export default function Skeleton({ className, ...props }) {
  return (
    <span
      aria-hidden="true"
      className={cn("skeleton block h-4 w-full", className)}
      {...props}
    />
  );
}

export function SkeletonRows({ rows = 6, className }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 rounded-control" />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? "h-3.5 w-2/3" : "h-3.5"}
        />
      ))}
    </div>
  );
}
