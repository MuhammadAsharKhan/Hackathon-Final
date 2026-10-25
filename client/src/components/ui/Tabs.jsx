import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export const tabId = (prefix, id) => `${prefix}-tab-${id}`;
export const tabPanelId = (prefix, id) => `${prefix}-panel-${id}`;

export default function Tabs({
  tabs,
  value,
  onChange,
  idPrefix = "tabs",
  label = "Sections",
  className,
  ...props
}) {
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // One element slides between tabs instead of each tab drawing its own line.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const active = list.querySelector('[aria-selected="true"]');
    if (!active) return;

    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, tabs.length]);

  const handleKeyDown = (event, index) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + offset + tabs.length) % tabs.length;
    const next = tabs[nextIndex];

    onChange(next.id);
    document.getElementById(tabId(idPrefix, next.id))?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar relative flex gap-1 overflow-x-auto border-b border-line-soft",
        className
      )}
      {...props}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === value;

        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "shrink-0 px-3 py-2.5 font-display text-sm font-semibold",
              active ? "text-text" : "text-muted hover:text-text"
            )}
          >
            {tab.label}
          </button>
        );
      })}

      <span
        aria-hidden="true"
        className="absolute bottom-0 h-[3px] rounded-pill bg-gradient-to-r from-blue to-blue-400 transition-[transform,width] duration-200 ease-brand"
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
      />
    </div>
  );
}
