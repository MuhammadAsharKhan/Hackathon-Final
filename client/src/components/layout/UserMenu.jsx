import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/config/menus";
import { useAuth } from "@/hooks/useAuth";
import { CHANGE_PASSWORD_PATH } from "@/lib/navigation";
import { cn } from "@/lib/cn";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setOpen(false);

    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 items-center gap-2 rounded-control px-1.5 hover:bg-blue-50"
      >
        <Avatar user={user} size="sm" />
        <span className="hidden max-w-[9rem] truncate font-display text-sm font-semibold text-text md:inline">
          {user?.name}
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 text-muted transition-transform duration-150 md:block",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl bg-surface p-1.5 shadow-e3"
        >
          <div className="px-2.5 py-2">
            <p className="truncate font-display text-sm font-semibold text-text">
              {user?.name}
            </p>
            <p className="truncate text-xs text-muted">
              {ROLE_LABELS[user?.role] || "Signed in"}
            </p>
            {user?.email ? (
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            ) : null}
          </div>

          <div className="my-1 h-px bg-line-soft" />

          <Link
            to={CHANGE_PASSWORD_PATH}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2.5 rounded-small px-2.5 text-sm text-text-2 hover:bg-blue-50 hover:text-text"
          >
            <KeyRound className="h-4 w-4 text-muted" aria-hidden="true" />
            Change password
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex h-10 w-full items-center gap-2.5 rounded-small px-2.5 text-left text-sm text-status-rose hover:bg-status-rose-bg disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
