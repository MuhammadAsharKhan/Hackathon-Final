import { Link, NavLink } from "react-router-dom";
import { ROLE_LABELS, menuGroupsFor } from "@/config/menus";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

const linkClass = ({ isActive }) =>
  cn(
    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
    isActive
      ? "bg-surface-tint font-medium text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

export default function Sidebar({ onNavigate, className }) {
  const { user } = useAuth();
  const groups = menuGroupsFor(user?.role);

  return (
    <aside
      className={cn(
        "flex flex-col border-border bg-background",
        className
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          to="/dashboard"
          className="inline-flex min-h-10 items-center text-sm font-semibold tracking-tight text-foreground"
          onClick={onNavigate}
        >
          HCM Lite
        </Link>
      </div>

      <nav
        aria-label="Main"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
      >
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.label ? (
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                {group.label}
              </p>
            ) : null}

            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={onNavigate}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-5 py-4">
        <p className="truncate text-sm font-medium">{user?.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ROLE_LABELS[user?.role] || "Signed in"}
        </p>
      </div>
    </aside>
  );
}
