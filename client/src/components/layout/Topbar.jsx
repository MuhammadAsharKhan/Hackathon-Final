import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Button from "@/components/ui/Button";
import { pageTitleFor } from "@/config/menus";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

export default function Topbar({ onOpenMenu }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            className="h-10 w-10 px-0 md:hidden"
            aria-label="Open menu"
            onClick={onOpenMenu}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <p className="truncate text-sm text-muted-foreground">
            {pageTitleFor(pathname)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
