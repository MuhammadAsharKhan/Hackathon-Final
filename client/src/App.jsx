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
