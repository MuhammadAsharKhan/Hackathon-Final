import { cn } from "@/lib/cn";
import Button from "./Button";

export default function Pagination({
  page,
  pages,
  total,
  onChange,
  disabled = false,
  className,
}) {
  if (!pages || pages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "item" : "items"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-10 sm:h-8"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          Previous
        </Button>
        <span className="px-2 text-sm tabular-nums text-muted-foreground">
          Page {page} of {pages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="h-10 sm:h-8"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= pages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
