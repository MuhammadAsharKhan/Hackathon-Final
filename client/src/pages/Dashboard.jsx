import { LayoutDashboard } from "lucide-react";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { ROLE_LABELS } from "@/config/menus";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const DESCRIPTION = {
  admin: "Company wide totals and the audit trail.",
  hr: "Today at a glance and the approvals waiting on you.",
  employee: "Your day, your leave and your latest payslip.",
};

export default function Dashboard() {
  useDocumentTitle("Dashboard");

  const { user, employee } = useAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={DESCRIPTION[user?.role] || "Your workspace."}
      />

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-1 text-base font-medium">{user?.name}</p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="mt-0.5">{ROLE_LABELS[user?.role] || "Signed in"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Employee code</dt>
            <dd className="mt-0.5 tabular-nums">{employee?.code || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Department</dt>
            <dd className="mt-0.5">{employee?.department || "-"}</dd>
          </div>
        </dl>
      </Card>

      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard metrics are not built yet"
        description="Attendance, leave and payroll totals appear here once the dashboard endpoints are available."
      />
    </div>
  );
}
