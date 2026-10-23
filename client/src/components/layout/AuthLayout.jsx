import { Link, Outlet } from "react-router-dom";
import Container from "@/components/ui/Container";
import Footer from "./Footer";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <Container className="flex h-16 items-center">
          <Link
            to="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Baseline
          </Link>
        </Container>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <Container className="max-w-md">
          <Outlet />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
