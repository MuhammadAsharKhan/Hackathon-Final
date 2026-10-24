import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications.api";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const POLL_MS = 30000;
const LIST_LIMIT = 8;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // A page change closes the panel, so it never covers the next screen.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const loadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setCount(data.count);
    } catch {
      // A failed poll leaves the previous count in place.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active) return;
      await loadCount();
    };

    poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [loadCount]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listNotifications({ page: 1, limit: LIST_LIMIT });
      setItems(data.notifications);
      setCount(data.unreadCount ?? 0);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleMarkAll = async () => {
    if (marking) return;
    setMarking(true);

    try {
      await markAllNotificationsRead();
      setItems((previous) =>
        previous.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        }))
      );
      setCount(0);
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    } finally {
      setMarking(false);
    }
  };

  const handleOpenItem = async (item) => {
    setOpen(false);

    if (!item.readAt) {
      setItems((previous) =>
        previous.map((row) =>
          row.id === item.id
            ? { ...row, readAt: new Date().toISOString() }
            : row
        )
      );
      setCount((previous) => Math.max(0, previous - 1));
      await markNotificationRead(item.id).catch(() => {});
    }

    if (item.link) navigate(item.link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-medium leading-4 text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Notifications</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              loading={marking}
              disabled={count === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Loading notifications</span>
              </div>
            ) : error ? (
              <div className="space-y-3 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="secondary" size="sm" onClick={loadList}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      className={cn(
                        "block w-full border-b border-border px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-surface",
                        !item.readAt && "bg-surface-tint"
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                        {!item.readAt ? (
                          <span
                            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : null}
                      </span>
                      {item.message ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.message}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
