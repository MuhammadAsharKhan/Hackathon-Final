import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";
import AuthLayout from "@/components/layout/AuthLayout";
import ScrollManager from "@/components/layout/ScrollManager";
import GuestRoute from "@/components/GuestRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import Spinner from "@/components/ui/Spinner";
import { features } from "@/config/features";
import AdminUsers from "@/pages/AdminUsers";
import Dashboard from "@/pages/Dashboard";
import FindUser from "@/pages/FindUser";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Register from "@/pages/Register";

const AiBuddy = lazy(() => import("@/pages/AiBuddy"));
const AdminAi = lazy(() => import("@/pages/AdminAi"));

const pageFallback = (
  <div role="status" className="flex min-h-[40vh] items-center justify-center">
    <Spinner className="h-5 w-5 text-muted-foreground" />
    <span className="sr-only">Loading</span>
  </div>
);

export default function App() {
  return (
    <>
      <ScrollManager />

      <Suspense fallback={pageFallback}>
        <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-user"
            element={
              <ProtectedRoute>
                <FindUser />
              </ProtectedRoute>
            }
          />
          {features.aiPage ? (
            <Route
              path="/ai-buddy"
              element={
                <ProtectedRoute>
                  <AiBuddy />
                </ProtectedRoute>
              }
            />
          ) : null}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ai"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminAi />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          element={
            <GuestRoute>
              <AuthLayout />
            </GuestRoute>
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        </Routes>
      </Suspense>

      <Toaster
        position="bottom-right"
        ariaProps={{ role: "status", "aria-live": "polite" }}
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 2px rgba(10, 10, 10, 0.06)",
            fontSize: "14px",
            padding: "10px 14px",
          },
          success: {
            iconTheme: { primary: "var(--success)", secondary: "#ffffff" },
          },
          error: {
            iconTheme: { primary: "var(--danger)", secondary: "#ffffff" },
          },
        }}
      />
    </>
  );
}
