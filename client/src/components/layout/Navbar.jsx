import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { features } from "@/config/features";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

const linkClass = ({ isActive }) =>
  cn(
    "inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm transition-colors duration-150",
    isActive
      ? "font-medium text-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

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

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/find-user", label: "Find user" },
    ...(features.aiPage ? [{ to: "/ai-buddy", label: "AI Buddy" }] : []),
    ...(user?.role === "admin"
      ? [
          { to: "/admin/users", label: "Users" },
          { to: "/admin/ai", label: "AI settings" },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Baseline
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
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
                className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-muted"
              >
                <Avatar user={user} size="sm" />
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
                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                Sign in
              </Link>
              <Button as={Link} to="/register">
                Create account
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors duration-150 hover:bg-muted md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      {mobileOpen ? (
        <div className="border-t border-border md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass}>
                  {link.label}
                </NavLink>
              ))}

              {user ? (
                <>
                  <NavLink to="/profile" className={linkClass}>
                    Profile
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex min-h-10 items-center rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                  <Button as={Link} to="/login" variant="secondary">
                    Sign in
                  </Button>
                  <Button as={Link} to="/register">
                    Create account
                  </Button>
                </div>
              )}
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
