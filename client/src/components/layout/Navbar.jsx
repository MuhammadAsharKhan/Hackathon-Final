import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

const linkClass = ({ isActive }) =>
  cn(
    "rounded-md px-3 py-2 text-sm transition-colors duration-150",
    isActive
      ? "font-medium text-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

const primaryLink =
  "inline-flex h-9 items-center justify-center rounded-lg border border-primary bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90";

const secondaryLink =
  "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-surface";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const initials = (user?.name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Baseline
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            {user?.role === "admin" ? (
              <NavLink to="/admin/users" className={linkClass}>
                Users
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div ref={menuRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-medium">
                  {initials}
                </span>
                <span className="max-w-[10rem] truncate">{user.name}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-150",
                    menuOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-sm"
                >
                  <Link
                    to="/profile"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted"
                  >
                    <User
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted"
                  >
                    <LogOut
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                Sign in
              </Link>
              <Link to="/register" className={primaryLink}>
                Create account
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="rounded-lg p-2 text-foreground transition-colors duration-150 hover:bg-muted md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border md:hidden">
          <nav
            className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3"
            aria-label="Mobile"
          >
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            {user?.role === "admin" ? (
              <NavLink to="/admin/users" className={linkClass}>
                Users
              </NavLink>
            ) : null}

            {user ? (
              <>
                <NavLink to="/profile" className={linkClass}>
                  Profile
                </NavLink>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Link to="/login" className={secondaryLink}>
                  Sign in
                </Link>
                <Link to="/register" className={primaryLink}>
                  Create account
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
