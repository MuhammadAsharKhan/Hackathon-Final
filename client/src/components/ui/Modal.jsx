import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
  variant = "center",
  ...props
}) {
  const isDrawer = variant === "drawer";
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const reservedGutter =
      typeof CSS !== "undefined" &&
      CSS.supports?.("scrollbar-gutter", "stable");

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0 && !reservedGutter) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const getFocusable = () =>
      Array.from(panel?.querySelectorAll(FOCUSABLE) || []).filter(
        (element) => element.offsetParent !== null
      );

    const firstField = panel?.querySelector(
      "input:not([disabled]):not([readonly]), textarea:not([disabled]), select:not([disabled])"
    );
    if (firstField) {
      firstField.focus();
    } else if (panel) {
      panel.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const nodes = getFocusable();
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div
      className={
        isDrawer
          ? "fixed inset-0 z-50 flex justify-end"
          : "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      }
    >
      <div
        className="animate-overlay-in overlay-backdrop absolute inset-0"
        onClick={() => {
          if (dismissible) onCloseRef.current?.();
        }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          isDrawer
            ? "animate-panel-in relative flex h-full max-h-dvh w-full flex-col border-l border-border bg-background shadow-sm sm:max-w-xl"
            : "animate-panel-in relative flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col rounded-t-xl border border-border bg-background shadow-sm sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl",
          className
        )}
        {...props}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-1">
            {title ? (
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              aria-label="Close dialog"
              className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
