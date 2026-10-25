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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parseMonth = (value) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) };
};

const nowParts = () => {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
};

const MonthInput = forwardRef(function MonthInput(
  {
    label,
    error,
    hint,
    required,
    className,
    id,
    value,
    onChange,
    disabled = false,
    placeholder = "Choose a month",
    ...props
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  const selected = useMemo(() => parseMonth(value), [value]);
  const today = useMemo(nowParts, []);

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(today.y);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const openPanel = useCallback(() => {
    if (disabled) return;
    setYear(selected?.y ?? today.y);
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

  const commit = (m) => {
    onChange?.({
      target: { value: `${year}-${String(m).padStart(2, "0")}`, name: props.name },
    });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

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
            {selected ? `${MONTHS[selected.m - 1]} ${selected.y}` : placeholder}
          </span>
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Choose a month"
            onKeyDown={handleKeyDown}
            className="animate-pop-in absolute left-0 top-full z-50 mt-1.5 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl bg-surface p-3 shadow-e3"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm font-bold text-text">{year}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setYear((current) => current - 1)}
                  aria-label="Previous year"
                  className="flex h-9 w-9 items-center justify-center rounded-small text-text-2 hover:bg-blue-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setYear((current) => current + 1)}
                  aria-label="Next year"
                  className="flex h-9 w-9 items-center justify-center rounded-small text-text-2 hover:bg-blue-50"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {SHORT.map((month, index) => {
                const monthNumber = index + 1;
                const isSelected =
                  selected?.y === year && selected?.m === monthNumber;
                const isCurrent = today.y === year && today.m === monthNumber;

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => commit(monthNumber)}
                    aria-label={`${MONTHS[index]} ${year}`}
                    className={cn(
                      "relative flex h-11 items-center justify-center rounded-[10px] font-display text-[13.5px] font-semibold",
                      isSelected
                        ? "bg-brand-gradient text-white"
                        : "text-text hover:bg-blue-50"
                    )}
                  >
                    {month}
                    {isCurrent && !isSelected ? (
                      <span
                        className="absolute bottom-1.5 h-1 w-1 rounded-full bg-blue"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
});

export default MonthInput;
