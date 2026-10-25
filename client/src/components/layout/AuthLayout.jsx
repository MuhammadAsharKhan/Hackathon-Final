import { Outlet } from "react-router-dom";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import Footer from "./Footer";

/**
 * Split screen from 1024px up: 56% brand panel, 44% form on mist.
 * Below that the panel becomes a 200px banner and the form sheet overlaps it
 * by 40px.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[56fr_44fr]">
      <div className="hidden lg:block">
        <AuthBrandPanel variant="panel" />
      </div>

      <div className="flex min-h-screen flex-col lg:min-h-0">
        <div className="lg:hidden">
          <AuthBrandPanel variant="banner" />
        </div>

        <main className="relative z-10 -mt-10 flex flex-1 items-start justify-center px-4 pb-6 sm:px-6 lg:mt-0 lg:items-center lg:px-10 lg:py-12">
          <div className="w-full max-w-[420px] rounded-t-modal bg-surface px-5 pb-8 pt-6 shadow-none sm:px-8 lg:rounded-modal lg:p-8 lg:shadow-e2">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
