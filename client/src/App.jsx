import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppShell from "@/components/layout/AppShell";
import AuthLayout from "@/components/layout/AuthLayout";
import ScrollManager from "@/components/layout/ScrollManager";
import GuestRoute from "@/components/GuestRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import SetupGate from "@/components/SetupGate";
import PageLoading from "@/components/ui/PageLoading";
import AdminUsers from "@/pages/AdminUsers";
import Announcements from "@/pages/Announcements";
import AuditLog from "@/pages/AuditLog";
import ChangePassword from "@/pages/ChangePassword";
import ComingSoon from "@/pages/ComingSoon";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import MyProfile from "@/pages/MyProfile";
import NotFound from "@/pages/NotFound";
import Organization from "@/pages/Organization";
import Setup from "@/pages/Setup";

const AdminAi = lazy(() => import("@/pages/AdminAi"));

const pageFallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <PageLoading />
  </div>
);

const LATER_SCREENS = {
  employees: {
    path: "/employees",
    title: "Employees",
    description: "People records, salary and imports.",
  },
  attendance: {
    path: "/attendance",
    title: "Attendance",
    description: "The daily board and correction requests.",
  },
  leave: {
    path: "/leave/requests",
    title: "Leave",
    description: "Leave requests waiting for a decision.",
  },
  payroll: {
    path: "/payroll",
    title: "Payroll",
    description: "Monthly drafts, finalization and payslips.",
  },
  myAttendance: {
    path: "/me/attendance",
    title: "My attendance",
    description: "Your check-ins, check-outs and corrections.",
  },
  myLeave: {
    path: "/me/leave",
    title: "My leave",
    description: "Your balances and requests.",
  },
  myPayslips: {
    path: "/me/payslips",
    title: "My payslips",
    description: "Finalized payslips you can download.",
  },
};

export default function App() {
  return (
    <>
      <ScrollManager />

      <Suspense fallback={pageFallback}>
        <Routes>
          <Route element={<SetupGate />}>
            <Route element={<AuthLayout />}>
              <Route path="/setup" element={<Setup />} />
            </Route>

            <Route
              element={
                <GuestRoute>
                  <AuthLayout />
                </GuestRoute>
              }
            >
              <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AuthLayout />}>
                <Route
                  path="/change-password"
                  element={<ChangePassword />}
                />
              </Route>

              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/announcements" element={<Announcements />} />

                <Route element={<ProtectedRoute roles={["admin"]} />}>
                  <Route path="/admin/organization" element={<Organization />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/audit" element={<AuditLog />} />
                  <Route path="/admin/ai" element={<AdminAi />} />
                </Route>

                <Route element={<ProtectedRoute roles={["admin", "hr"]} />}>
                  <Route
                    path="/employees"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.employees.title}
                        description={LATER_SCREENS.employees.description}
                      />
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.attendance.title}
                        description={LATER_SCREENS.attendance.description}
                      />
                    }
                  />
                  <Route
                    path="/leave/requests"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.leave.title}
                        description={LATER_SCREENS.leave.description}
                      />
                    }
                  />
                  <Route
                    path="/payroll"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.payroll.title}
                        description={LATER_SCREENS.payroll.description}
                      />
                    }
                  />
                </Route>

                <Route element={<ProtectedRoute roles={["hr", "employee"]} />}>
                  <Route
                    path="/me/attendance"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.myAttendance.title}
                        description={LATER_SCREENS.myAttendance.description}
                      />
                    }
                  />
                  <Route
                    path="/me/leave"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.myLeave.title}
                        description={LATER_SCREENS.myLeave.description}
                      />
                    }
                  />
                  <Route
                    path="/me/payslips"
                    element={
                      <ComingSoon
                        title={LATER_SCREENS.myPayslips.title}
                        description={LATER_SCREENS.myPayslips.description}
                      />
                    }
                  />
                  <Route path="/me/profile" element={<MyProfile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
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
            boxShadow:
              "0 1px 2px color-mix(in srgb, var(--foreground) 6%, transparent)",
            fontSize: "14px",
            padding: "10px 14px",
          },
          success: {
            iconTheme: {
              primary: "var(--success)",
              secondary: "var(--background)",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--danger)",
              secondary: "var(--background)",
            },
          },
        }}
      />
    </>
  );
}
