import { Link, Outlet } from "react-router-dom";
import Footer from "./Footer";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-6">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Baseline
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
