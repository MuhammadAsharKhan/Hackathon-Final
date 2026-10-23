import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import CompleteProfileModal from "@/components/auth/CompleteProfileModal";
import Container from "@/components/ui/Container";
import { features } from "@/config/features";
import Footer from "./Footer";
import Navbar from "./Navbar";

const AiChatWidget = lazy(() => import("@/components/ai/AiChatWidget"));

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Container className="py-10 sm:py-12">
          <Outlet />
        </Container>
      </main>
      <Footer />
      <CompleteProfileModal />
      {features.aiWidget ? (
        <Suspense fallback={null}>
          <AiChatWidget />
        </Suspense>
      ) : null}
    </div>
  );
}
