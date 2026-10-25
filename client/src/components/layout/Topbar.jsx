import { useLocation } from "react-router-dom";
import { Menu, Sparkles } from "lucide-react";
import { useAssistantPanel } from "@/components/ai/AssistantProvider";
import { pageTitleFor } from "@/config/menus";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

export default function Topbar({ onOpenMenu }) {
  const { pathname } = useLocation();
  const { openAssistant } = useAssistantPanel();
  const timeZone = useCompanyTimeZone();

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-white/[0.72] backdrop-blur-[14px] backdrop-saturate-[1.4]">
      <div className="flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-text-2 hover:bg-blue-50 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="truncate font-display text-lg font-extrabold tracking-[-0.02em] text-text">
              {pageTitleFor(pathname)}
            </p>
            <p className="truncate text-[13px] text-muted">{today}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* 1px gradient border, 40px tall */}
          <button
            type="button"
            onClick={openAssistant}
            className="hidden rounded-pill bg-gradient-to-r from-blue to-lime p-px sm:inline-flex"
          >
            <span className="inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-4 font-display text-[13.5px] font-semibold text-text hover:bg-blue-50">
              <Sparkles className="h-4 w-4 text-blue" aria-hidden="true" />
              Ask assistant
            </span>
          </button>

          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
