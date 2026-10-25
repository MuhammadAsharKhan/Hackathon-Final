import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";
import DateInput from "@/components/ui/DateInput";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 400;

function SearchField({ search }) {
  const [draft, setDraft] = useState(search.value || "");
  const onChangeRef = useRef(search.onChange);
  const currentValue = search.value || "";

  useEffect(() => {
    onChangeRef.current = search.onChange;
  }, [search.onChange]);

  // A cleared filter from the page wins over whatever is still typed here.
  useEffect(() => {
    setDraft(currentValue);
  }, [currentValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = draft.trim();
      if (next !== currentValue.trim()) onChangeRef.current?.(next);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft, currentValue]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={search.label || search.placeholder || "Search"}
        placeholder={search.placeholder || "Search"}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="pl-9"
      />
    </div>
  );
}

export default function FilterBar({
  search,
  filters = [],
  fields = [],
  dateRange,
  onClear,
  actions,
  className,
}) {
  const filterValues = filters.map((filter) => filter.value || "");
  const fieldValues = fields.map((field) => field.value || "");
  const anyActive =
    Boolean(search?.value) ||
    filterValues.some(Boolean) ||
    fieldValues.some(Boolean) ||
    Boolean(dateRange?.from) ||
    Boolean(dateRange?.to);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-surface px-3 py-3 shadow-e1 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {search ? <SearchField search={search} /> : null}

        {filters.map((filter) => (
          <div key={filter.key} className="w-full sm:w-44">
            <Select
              aria-label={filter.label}
              value={filter.value || ""}
              onChange={(event) => filter.onChange(event.target.value)}
            >
              <option value="">{filter.allLabel || `All ${filter.label}`}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ))}

        {fields.map((field) => (
          <div key={field.key} className="w-full sm:w-44">
            <Input
              aria-label={field.label}
              placeholder={field.placeholder || field.label}
              value={field.value || ""}
              onChange={(event) => field.onChange(event.target.value)}
            />
          </div>
        ))}

        {dateRange ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-40">
              <DateInput
                label={dateRange.fromLabel || "From"}
                value={dateRange.from || ""}
                max={dateRange.to || undefined}
                onChange={(event) => dateRange.onFromChange(event.target.value)}
              />
            </div>
            <div className="w-full sm:w-40">
              <DateInput
                label={dateRange.toLabel || "To"}
                value={dateRange.to || ""}
                min={dateRange.from || undefined}
                onChange={(event) => dateRange.onToChange(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {anyActive && onClear ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 shrink-0"
            onClick={onClear}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
