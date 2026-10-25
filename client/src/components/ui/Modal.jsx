import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const INTENTS = {
  info: { chip: "bg-blue-50 text-blue-700", Icon: Info },
  danger: { chip: "bg-status-rose-bg text-status-rose", Icon: AlertTriangle },
  success: { chip: "bg-lime-50 text-lime-700", Icon: CheckCircle2 },
};

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
  intent,
  ...props
}) {
  const isDrawer = variant === "drawer";
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (!dismissible) return;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current?.(), 120);
  }, [dismissible]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const reservedGutter =
      typeof CSS !== "undefined" && CSS.supports?.("scrollbar-gutter", "stable");

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

  const Intent = intent && INTENTS[intent] ? INTENTS[intent] : null;

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
        onClick={requestClose}
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
          "relative flex flex-col bg-surface shadow-e4",
          isDrawer
            ? "h-full max-h-dvh w-full max-w-[440px] rounded-l-modal"
            : "max-h-[calc(100dvh-1rem)] w-full max-w-lg rounded-t-modal sm:max-h-[calc(100dvh-2rem)] sm:rounded-modal",
          closing
            ? "opacity-0 transition-opacity duration-100"
            : isDrawer
              ? "animate-drawer-right"
              : "animate-modal-in",
          className
        )}
        {...props}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-2 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            {Intent ? (
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
                  Intent.chip
                )}
                aria-hidden="true"
              >
                <Intent.Icon className="h-5 w-5" />
              </span>
            ) : null}

            <div className="min-w-0">
              {title ? (
                <h2
                  id={titleId}
                  className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-text"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          {dismissible ? (
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close dialog"
              className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-muted hover:bg-blue-50 hover:text-text"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2 pt-3">{children}</div>

        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-line-soft px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
