import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import Select from "./Select";

export default function Pagination({
  page,
  pages,
  total,
  onChange,
  disabled = false,
  itemLabel = "items",
  itemLabelSingular = "item",
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
  ...props
}) {
  const from = total === 0 ? 0 : (page - 1) * (pageSize || total) + 1;
  const to =
    pageSize && total > 0
      ? Math.min(total, page * pageSize)
      : total;

  if (!pages || pages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <p className="text-[13px] text-muted">
        Showing{" "}
        <span className="tabular-nums text-text-2">{from}</span> to{" "}
        <span className="tabular-nums text-text-2">{to}</span> of{" "}
        <span className="tabular-nums text-text-2">{total}</span>{" "}
        {total === 1 ? itemLabelSingular : itemLabel}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && pageSize ? (
          <div className="mr-1 w-[124px]">
            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              placeholder="Rows"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="flex items-center gap-1 rounded-pill bg-surface p-1 shadow-e1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
            className="flex h-9 w-9 items-center justify-center rounded-pill text-text-2 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <span className="px-2 font-display text-[13px] font-semibold tabular-nums text-text">
            {page} / {pages}
          </span>

          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={disabled || page >= pages}
            aria-label="Next page"
            className="flex h-9 w-9 items-center justify-center rounded-pill text-text-2 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
