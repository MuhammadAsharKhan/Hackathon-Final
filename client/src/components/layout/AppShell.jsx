import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { AssistantProvider } from "@/components/ai/AssistantProvider";
import { CompanyTimeProvider } from "@/context/CompanyTimeContext";
import Sidebar, { readCollapsed } from "./Sidebar";
import Topbar from "./Topbar";

const STORAGE_KEY = "smit.sidebar.collapsed";

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { pathname } = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // The drawer locks the page and closes on Escape.
  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const previousPadding = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // A blocked storage write only costs the preference.
      }
      return next;
    });
  }, []);

  return (
    <CompanyTimeProvider>
      <AssistantProvider>
        <div className="min-h-screen bg-mist">
          {/* one faint blue glow, top left */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 h-[600px] w-[600px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-blue/[0.07] blur-[100px]"
          />

          <div className="relative flex min-h-screen">
            <Sidebar
              className="sticky top-0 hidden h-screen shrink-0 lg:flex"
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
            />

            {drawerOpen ? (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div
                  className="animate-overlay-in overlay-backdrop absolute inset-0"
                  onClick={() => setDrawerOpen(false)}
                  aria-hidden="true"
                />
                <div className="animate-drawer-left relative flex h-full w-[272px] max-w-[84vw] flex-col">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                    className="absolute right-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-control text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <Sidebar
                    className="h-full w-full"
                    onNavigate={() => setDrawerOpen(false)}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar onOpenMenu={() => setDrawerOpen(true)} />

              <main className="flex-1">
                <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </div>
      </AssistantProvider>
    </CompanyTimeProvider>
  );
}
