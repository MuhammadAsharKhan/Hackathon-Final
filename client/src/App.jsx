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
import AttendanceBoard from "@/pages/AttendanceBoard";
import AuditLog from "@/pages/AuditLog";
import ChangePassword from "@/pages/ChangePassword";
import Dashboard from "@/pages/Dashboard";
import EmployeeDetail from "@/pages/EmployeeDetail";
import Employees from "@/pages/Employees";
import LeaveRequests from "@/pages/LeaveRequests";
import Login from "@/pages/Login";
import MyAttendance from "@/pages/MyAttendance";
import MyLeave from "@/pages/MyLeave";
import MyPayslips from "@/pages/MyPayslips";
import MyProfile from "@/pages/MyProfile";
import NotFound from "@/pages/NotFound";
import Organization from "@/pages/Organization";
import Payroll from "@/pages/Payroll";
import PayrollRun from "@/pages/PayrollRun";
import Setup from "@/pages/Setup";

const AdminAi = lazy(() => import("@/pages/AdminAi"));

// Development only. The import is dropped from production bundles.
const DevShowcase = import.meta.env.DEV
  ? lazy(() => import("@/components/ui/Showcase"))
  : null;

const pageFallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <PageLoading />
  </div>
);

export default function App() {
  return (
    <>
      <ScrollManager />

      <Suspense fallback={pageFallback}>
        <Routes>
          {DevShowcase ? (
            <Route
              path="/dev/ui"
              element={
                <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
                  <DevShowcase />
                </div>
              }
            />
          ) : null}

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

                {/* The server decides who may open a record, so an employee
                    who guesses another id gets its 403 message. */}
                <Route path="/employees/:id" element={<EmployeeDetail />} />

                <Route element={<ProtectedRoute roles={["admin", "hr"]} />}>
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/attendance" element={<AttendanceBoard />} />
                  <Route path="/leave/requests" element={<LeaveRequests />} />
                  <Route path="/payroll" element={<Payroll />} />
                  <Route path="/payroll/:id" element={<PayrollRun />} />
                </Route>

                <Route element={<ProtectedRoute roles={["hr", "employee"]} />}>
                  <Route path="/me/attendance" element={<MyAttendance />} />
                  <Route path="/me/leave" element={<MyLeave />} />
                  <Route path="/me/payslips" element={<MyPayslips />} />
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
            background: "#FFFFFF",
            color: "#0B1626",
            border: "1px solid #EEF2F8",
            borderLeft: "4px solid #1C74EF",
            borderRadius: "14px",
            boxShadow:
              "0 14px 34px -8px rgba(12,38,92,0.16), 0 3px 8px rgba(12,38,92,0.06)",
            fontFamily: "Inter Variable, Inter, system-ui, sans-serif",
            fontSize: "13.5px",
            padding: "10px 14px",
          },
          success: {
            style: { borderLeft: "4px solid #4F8A1D" },
            iconTheme: { primary: "#4F8A1D", secondary: "#FFFFFF" },
          },
          error: {
            style: { borderLeft: "4px solid #BE123C" },
            iconTheme: { primary: "#BE123C", secondary: "#FFFFFF" },
          },
        }}
      />
    </>
  );
}
