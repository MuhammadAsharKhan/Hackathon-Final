import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Logo from "@/components/brand/Logo";
import Avatar from "@/components/ui/Avatar";
import { ROLE_LABELS, menuGroupsFor } from "@/config/menus";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "smit.sidebar.collapsed";

export const readCollapsed = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export default function Sidebar({
  onNavigate,
  className,
  collapsed = false,
  onToggleCollapse,
  onRequestClose,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const groups = menuGroupsFor(user?.role);

  const navRef = useRef(null);
  const [indicatorTop, setIndicatorTop] = useState(null);

  // Measure the active row so the indicator can slide to it.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // NavLink marks the active row with aria-current, so measuring it keeps the
    // indicator correct even when a route nests deeper than its menu entry.
    const active = nav.querySelector('[aria-current="page"]');
    if (!active) {
      setIndicatorTop(null);
      return;
    }

    setIndicatorTop(active.offsetTop + active.offsetHeight / 2 - 11);
  }, [pathname, collapsed, groups.length]);

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-ink-gradient",
        collapsed ? "w-[84px]" : "w-[272px]",
        "transition-[width] duration-200 ease-brand",
        className
      )}
    >
      <div
        className={cn(
          "flex h-[68px] shrink-0 items-center",
          collapsed ? "justify-center px-2" : "justify-between px-5"
        )}
      >
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          aria-label="S.M.I.T-Lite dashboard"
          className="inline-flex items-center rounded-small"
        >
          <Logo
            tone="light"
            size="md"
            variant={collapsed ? "mark" : "full"}
          />
        </NavLink>

        {collapsed || !onToggleCollapse ? null : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse navigation"
            className="flex h-9 w-9 items-center justify-center rounded-small text-white/60 hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse ? (
        <div className="flex shrink-0 justify-center pb-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand navigation"
            className="flex h-9 w-9 items-center justify-center rounded-small text-white/60 hover:bg-white/10 hover:text-white"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <nav
        ref={navRef}
        aria-label="Main"
        className={cn(
          "relative flex-1 overflow-y-auto overflow-x-hidden py-3",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {indicatorTop === null || collapsed ? null : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-[22px] w-1 rounded-pill bg-gradient-to-b from-blue to-lime transition-transform duration-200 ease-brand"
            style={{ transform: `translateY(${indicatorTop}px)` }}
          />
        )}

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id}>
              {group.label && !collapsed ? (
                <p className="px-3 pb-2 text-[12.5px] font-semibold text-white/45">
                  {group.label}
                </p>
              ) : null}

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group flex h-11 items-center rounded-control",
                            collapsed ? "justify-center px-0" : "gap-4 px-2.5",
                            isActive
                              ? "bg-white/[0.09] text-white"
                              : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                                isActive
                                  ? "bg-brand-gradient shadow-[0_4px_14px_-2px_rgba(28,116,239,0.65)]"
                                  : "bg-transparent"
                              )}
                            >
                              <Icon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                            <span
                              className={cn(
                                "truncate font-display text-[14.5px] font-semibold transition-opacity duration-200",
                                collapsed
                                  ? "pointer-events-none w-0 opacity-0"
                                  : "opacity-100"
                              )}
                            >
                              {item.label}
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-white/10",
          collapsed ? "p-2" : "p-3"
        )}
      >
        <div
          className={cn(
            "flex items-center rounded-control",
            collapsed ? "justify-center" : "gap-3 px-2 py-2"
          )}
        >
          <Avatar user={user} size="md" />
          {collapsed ? null : (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-white">
                {user?.name}
              </p>
              <p className="truncate text-xs text-white/50">
                {ROLE_LABELS[user?.role] || "Signed in"}
              </p>
            </div>
          )}
          {collapsed ? null : (
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-small text-white/60 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
