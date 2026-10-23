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
}) {
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
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 border-b border-border", className)}
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
              "-mb-px inline-flex min-h-10 items-center border-b-2 px-3 py-2 text-sm transition-colors duration-150",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
