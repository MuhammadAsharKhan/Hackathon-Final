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
  const navigate = useNavigate();

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
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted"
      >
        <Avatar user={user} size="sm" />
        <span className="hidden max-w-[10rem] truncate sm:inline">
          {user?.name}
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 text-muted-foreground transition-transform duration-150 sm:block",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABELS[user?.role] || "Signed in"}
              {user?.email ? ` · ${user.email}` : ""}
            </p>
          </div>

          <Link
            to={CHANGE_PASSWORD_PATH}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Change password
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
