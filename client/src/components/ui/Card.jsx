import { cn } from "@/lib/cn";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-card bg-surface shadow-e2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
