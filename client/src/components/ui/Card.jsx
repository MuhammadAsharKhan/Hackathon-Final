import { cn } from "@/lib/cn";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-background", className)}
      {...props}
    >
      {children}
    </div>
  );
}
