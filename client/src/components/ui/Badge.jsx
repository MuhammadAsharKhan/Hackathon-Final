import { cn } from "@/lib/cn";

export const STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const styles = {
  todo: "badge-todo",
  in_progress: "badge-progress",
  done: "badge-done",
};

export default function Badge({ status, children, className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[status] || "border-border bg-surface text-muted-foreground",
        className
      )}
      {...props}
    >
      {status === "in_progress" ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {children || STATUS_LABELS[status]}
    </span>
  );
}
