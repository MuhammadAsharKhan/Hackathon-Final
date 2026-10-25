import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import Field, { fieldDescriptionId } from "./Field";

const SEARCH_THRESHOLD = 7;

const flattenOptions = (children, out = []) => {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      flattenOptions(child.props.children, out);
      return;
    }
    out.push({
      value: child.props.value ?? "",
      label: child.props.children ?? "",
      disabled: Boolean(child.props.disabled),
    });
  });
  return out;
};

/**
 * A custom listbox over the same props a native select takes. A visually hidden
 * native select keeps `value`, `onChange`, `name` and `ref` behaving exactly as
 * before for form libraries and tests.
 */
const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    required,
    className,
    id,
    children,
    value,
    onChange,
    disabled = false,
    placeholder = "Select",
    ...props
  },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;
  const listId = `${selectId}-listbox`;

  const options = useMemo(() => flattenOptions(children), [children]);
  const showSearch = options.length > SEARCH_THRESHOLD;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  const visible = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) =>
      String(option.label).toLowerCase().includes(needle)
    );
  }, [options, query]);

  const selectedIndex = options.findIndex(
    (option) => String(option.value) === String(value)
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const commit = useCallback(
    (next) => {
      onChange?.({ target: { value: next, name: props.name } });
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
    },
    [onChange, props.name]
  );

  const openPanel = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, selectedIndex]);

  // Flip above the trigger when there is no room below.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    setDropUp(roomBelow < 300 && rect.top > roomBelow);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  const move = (delta) => {
    if (visible.length === 0) return;
    setActiveIndex((current) => {
      let next = current;
      for (let step = 0; step < visible.length; step += 1) {
        next = (next + delta + visible.length) % visible.length;
        if (!visible[next]?.disabled) return next;
      }
      return current;
    });
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(visible.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = visible[activeIndex];
      if (option && !option.disabled) commit(option.value);
      return;
    }

    // Type-ahead, only when the search field is not handling the keys.
    if (!showSearch && event.key.length === 1) {
      const hit = options.find(
        (option) =>
          String(option.label)
            .toLowerCase()
            .startsWith(event.key.toLowerCase()) && !option.disabled
      );
      if (hit) commit(hit.value);
    }
  };

  return (
    <Field
      id={selectId}
      label={label}
      error={error}
      hint={hint}
      required={required}
    >
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescriptionId(selectId, error, hint)}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-control border px-3.5 text-left text-[15px]",
            "focus:bg-surface focus:outline-none focus:ring-4",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-status-rose bg-status-rose-bg/50 focus:border-status-rose focus:ring-status-rose/15"
              : "border-transparent bg-[#F5F8FD] hover:border-[#D3DDEE] focus:border-blue focus:ring-blue/15",
            open && !error && "border-blue bg-surface ring-4 ring-blue/15"
          )}
        >
          <span
            className={cn(
              "truncate",
              selected ? "text-text" : "text-muted"
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "h-[18px] w-[18px] shrink-0 text-muted transition-transform duration-200 ease-brand",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div
            className={cn(
              "z-50 overflow-hidden bg-surface shadow-e3 animate-pop-in",
              "fixed inset-x-0 bottom-0 rounded-t-modal p-2 sm:absolute sm:inset-x-0 sm:rounded-xl sm:p-1.5",
              dropUp ? "sm:bottom-full sm:mb-1.5" : "sm:top-full sm:mt-1.5"
            )}
          >
            {showSearch ? (
              <div className="relative mb-1.5 px-1 sm:px-0">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search"
                  aria-label="Search options"
                  className="h-10 w-full rounded-[10px] border border-line bg-mist pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-blue focus:outline-none"
                />
              </div>
            ) : null}

            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label || "Options"}
              tabIndex={-1}
              className="max-h-64 overflow-y-auto"
            >
              {visible.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted">No matches</li>
              ) : null}

              {visible.map((option, index) => {
                const isSelected = String(option.value) === String(value);
                const isActive = index === activeIndex;

                return (
                  <li key={`${option.value}-${index}`} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(option.value)}
                      className={cn(
                        "flex h-10 w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm",
                        option.disabled && "cursor-not-allowed opacity-50",
                        isSelected
                          ? "bg-blue-100 font-semibold text-text"
                          : isActive
                            ? "bg-blue-50 text-text"
                            : "text-text-2"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-blue-700"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* Native fallback: same value, same onChange, hidden from view. */}
        <select
          ref={ref}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          {...props}
        >
          {children}
        </select>
      </div>
    </Field>
  );
});

export default Select;
