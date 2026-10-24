import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { AssistantProvider } from "@/components/ai/AssistantProvider";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { CompanyTimeProvider } from "@/context/CompanyTimeContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  return (
    <CompanyTimeProvider>
      <AssistantProvider>
        <div className="min-h-screen bg-background md:flex">
        <Sidebar className="sticky top-0 hidden h-screen w-64 shrink-0 border-r md:flex" />

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="animate-overlay-in overlay-backdrop absolute inset-0"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="animate-panel-in relative flex h-full w-64 max-w-[80vw] flex-col border-r border-border bg-background">
              <Button
                variant="ghost"
                className="absolute right-2 top-3 z-10 h-10 w-10 px-0"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
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
            <Container className="py-8 sm:py-10">
              <Outlet />
            </Container>
          </main>
        </div>
        </div>
      </AssistantProvider>
    </CompanyTimeProvider>
  );
}
