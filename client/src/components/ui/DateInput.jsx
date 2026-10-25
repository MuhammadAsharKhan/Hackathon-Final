import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const toIso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const parseIso = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
};

const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

// Monday first, so the working week reads left to right.
const weekdayIndex = (y, m, d) => (new Date(y, m - 1, d).getDay() + 6) % 7;

const todayParts = () => {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
};

const formatDisplay = (parts) => {
  if (!parts) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(parts.y, parts.m - 1, parts.d));
};

const DateInput = forwardRef(function DateInput(
  {
    label,
    error,
    hint,
    required,
    className,
    id,
    value,
    onChange,
    min,
    max,
    disabled = false,
    placeholder = "Choose a date",
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  const selected = useMemo(() => parseIso(value), [value]);
  const today = useMemo(todayParts, []);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [cursor, setCursor] = useState({ ...today });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const gridRef = useRef(null);

  const minParts = parseIso(min);
  const maxParts = parseIso(max);

  const isDisabled = useCallback(
    (y, m, d) => {
      if (minParts) {
        const a = new Date(y, m - 1, d);
        const b = new Date(minParts.y, minParts.m - 1, minParts.d);
        if (a < b) return true;
      }
      if (maxParts) {
        const a = new Date(y, m - 1, d);
        const b = new Date(maxParts.y, maxParts.m - 1, maxParts.d);
        if (a > b) return true;
      }
      return false;
    },
    [minParts, maxParts]
  );

  const openPanel = useCallback(() => {
    if (disabled) return;
    const start = selected || today;
    setView({ y: start.y, m: start.m });
    setCursor({ ...start });
    setOpen(true);
  }, [disabled, selected, today]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Keep DOM focus on the cursor day so arrow keys feel native.
  useEffect(() => {
    if (!open) return;
    const node = gridRef.current?.querySelector('[data-cursor="true"]');
    node?.focus();
  }, [open, cursor]);

  const commit = (y, m, d) => {
    onChange?.({ target: { value: toIso(y, m, d), name: props.name } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const shiftMonth = (delta) => {
    setView((current) => {
      const next = new Date(current.y, current.m - 1 + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() + 1 };
    });
  };

  const moveCursor = (deltaDays) => {
    const next = new Date(cursor.y, cursor.m - 1, cursor.d + deltaDays);
    setCursor({
      y: next.getFullYear(),
      m: next.getMonth() + 1,
      d: next.getDate(),
    });
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }

    const keys = {
      ArrowLeft: () => moveCursor(-1),
      ArrowRight: () => moveCursor(1),
      ArrowUp: () => moveCursor(-7),
      ArrowDown: () => moveCursor(7),
      PageUp: () => moveCursor(-30),
      PageDown: () => moveCursor(30),
    };

    if (keys[event.key]) {
      event.preventDefault();
      keys[event.key]();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isDisabled(cursor.y, cursor.m, cursor.d)) {
        commit(cursor.y, cursor.m, cursor.d);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  // Follow the cursor when it walks into another month.
  useEffect(() => {
    if (!open) return;
    if (cursor.y !== view.y || cursor.m !== view.m) {
      setView({ y: cursor.y, m: cursor.m });
    }
  }, [open, cursor, view.y, view.m]);

  const total = daysInMonth(view.y, view.m);
  const leading = weekdayIndex(view.y, view.m, 1);
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, index) => index + 1),
  ];

  return (
    <Field
      id={inputId}
      label={label}
      error={error}
      hint={hint}
      required={required}
    >
      <div ref={containerRef} className={cn("relative", className)}>
        <input type="hidden" ref={ref} value={value ?? ""} {...props} />

        <button
          ref={triggerRef}
          type="button"
          id={inputId}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescriptionId(inputId, error, hint)}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-12 w-full items-center gap-2.5 rounded-control border px-3.5 text-left text-[15px]",
            "focus:bg-surface focus:outline-none focus:ring-4",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-status-rose bg-status-rose-bg/50 focus:border-status-rose focus:ring-status-rose/15"
              : "border-transparent bg-[#F5F8FD] hover:border-[#D3DDEE] focus:border-blue focus:ring-blue/15",
            open && !error && "border-blue bg-surface ring-4 ring-blue/15"
          )}
        >
          <Calendar
            className={cn("h-[18px] w-[18px] shrink-0", selected ? "text-blue" : "text-muted")}
            aria-hidden="true"
          />
          <span className={cn("truncate", selected ? "text-text" : "text-muted")}>
            {selected ? formatDisplay(selected) : placeholder}
          </span>
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Choose a date"
            onKeyDown={handleKeyDown}
            className="animate-pop-in absolute left-0 top-full z-50 mt-1.5 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl bg-surface p-3 shadow-e3"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm font-bold text-text">
                {MONTHS[view.m - 1]} {view.y}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                  className="flex h-9 w-9 items-center justify-center rounded-small text-text-2 hover:bg-blue-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                  className="flex h-9 w-9 items-center justify-center rounded-small text-text-2 hover:bg-blue-50"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="py-1 text-center text-[11.5px] font-semibold text-muted"
                >
                  {day}
                </span>
              ))}
            </div>

            <div ref={gridRef} className="grid grid-cols-7 gap-0.5">
              {cells.map((day, index) => {
                if (day === null) return <span key={`e-${index}`} />;

                const isSelected =
                  selected &&
                  selected.y === view.y &&
                  selected.m === view.m &&
                  selected.d === day;
                const isToday =
                  today.y === view.y && today.m === view.m && today.d === day;
                const isCursor =
                  cursor.y === view.y && cursor.m === view.m && cursor.d === day;
                const off = isDisabled(view.y, view.m, day);
                const weekend = weekdayIndex(view.y, view.m, day) >= 5;

                return (
                  <button
                    key={day}
                    type="button"
                    data-cursor={isCursor ? "true" : undefined}
                    tabIndex={isCursor ? 0 : -1}
                    disabled={off}
                    onClick={() => commit(view.y, view.m, day)}
                    onMouseEnter={() =>
                      setCursor({ y: view.y, m: view.m, d: day })
                    }
                    aria-current={isToday ? "date" : undefined}
                    aria-label={toIso(view.y, view.m, day)}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-small font-display text-[13.5px] font-semibold",
                      "transition-[background-color,color] duration-150",
                      off && "cursor-not-allowed text-muted/40",
                      isSelected
                        ? "bg-brand-gradient text-white"
                        : !off && (weekend ? "text-muted hover:bg-blue-50" : "text-text hover:bg-blue-50"),
                      isCursor && !isSelected && "ring-2 ring-blue/30"
                    )}
                  >
                    {day}
                    {isToday && !isSelected ? (
                      <span
                        className="absolute bottom-1 h-1 w-1 rounded-full bg-blue"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-end border-t border-line-soft pt-2">
              <button
                type="button"
                onClick={() => commit(today.y, today.m, today.d)}
                className="rounded-small px-2 py-1 font-display text-[13.5px] font-semibold text-blue hover:text-blue-700"
              >
                Today
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
});

export default DateInput;
