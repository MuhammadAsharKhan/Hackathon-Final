import { Outlet } from "react-router-dom";
import Container from "@/components/ui/Container";
import Footer from "./Footer";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <Container className="flex h-16 items-center">
          <span className="inline-flex min-h-10 items-center text-sm font-semibold tracking-tight text-foreground">
            HCM Lite
          </span>
        </Container>
      </header>

      <main className="flex flex-1 items-start justify-center py-10 sm:items-center">
        <Container className="max-w-md">
          <Outlet />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
