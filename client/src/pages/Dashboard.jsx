import { lazy, Suspense, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import MyDay from "@/components/dashboard/MyDay";
import SummaryCard from "@/components/dashboard/SummaryCard";
import FilterBar from "@/components/data/FilterBar";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import PageSection from "@/components/ui/PageSection";
import { getAdminDashboard, getHrDashboard, getMyDashboard } from "@/api/dashboard.api";
import { listDepartments } from "@/api/organization.api";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { addDays, todayInZone } from "@/lib/time";

// The chart library is large, so the two chart dashboards load on their own.
const AdminDashboard = lazy(() => import("@/components/dashboard/AdminDashboard"));
const HrDashboard = lazy(() => import("@/components/dashboard/HrDashboard"));

const DESCRIPTION = {
  admin: "Company wide totals, the money view and the audit trail.",
  hr: "Today at a glance, the approvals waiting on you and your own day.",
  employee: "Your day, your leave and your latest payslip.",
};

const PERIODS = [
  { value: "month", label: "This month" },
  { value: "week", label: "Last 7 days" },
  { value: "year", label: "This year" },
];

// A preset fills both dates, so the page only stores the two dates it sends.
const rangeFor = (period, timeZone) => {
  const today = todayInZone(timeZone);

  if (period === "week") return { from: addDays(today, -6), to: today };
  if (period === "year") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return { from: `${today.slice(0, 7)}-01`, to: today };
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
      <span className="sr-only" role="status">
        Loading the dashboard
      </span>
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");

  const { user } = useAuth();
  const timeZone = useCompanyTimeZone();
  const role = user?.role;
  const canFilter = role === "admin" || role === "hr";

  const [period, setPeriod] = useState("month");
  const initialRange = useMemo(() => rangeFor("month", timeZone), [timeZone]);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [departmentId, setDepartmentId] = useState("");

  const { data, loading, error, reload } = useResource(() => {
    if (role === "admin") {
      return getAdminDashboard({
        from,
        to,
        department: departmentId || undefined,
      }).then((admin) => ({ admin }));
    }

    if (role === "hr") {
      return Promise.all([
        getHrDashboard({ from, to, department: departmentId || undefined }),
        getMyDashboard(),
      ]).then(([hr, me]) => ({ hr, me }));
    }

    return getMyDashboard().then((me) => ({ me }));
  }, [role, from, to, departmentId]);

  const { data: org } = useResource(
    () => (canFilter ? listDepartments() : Promise.resolve(null)),
    [canFilter]
  );
  const departments = org?.departments || [];

  const applyPeriod = (next) => {
    setPeriod(next);
    const range = rangeFor(next, timeZone);
    setFrom(range.from);
    setTo(range.to);
  };

  const pending = data?.hr?.pendingApprovals;
  const waiting = pending ? (pending.leave || 0) + (pending.corrections || 0) : 0;

  const greetingContext =
    role === "hr" && pending
      ? waiting > 0
        ? `${pending.leave} leave and ${pending.corrections} attendance approvals are waiting for you.`
        : "Nothing is waiting for you."
      : DESCRIPTION[role] || "Your workspace.";

  const greetingActions =
    role === "admin"
      ? [
          { label: "Open payroll", to: "/payroll" },
          { label: "Create HR login", to: "/admin/users" },
        ]
      : role === "hr"
        ? [
            { label: "Review approvals", to: "/leave/requests" },
            { label: "Register employee", to: "/employees" },
          ]
        : [
            { label: "Check in", to: "/me/attendance" },
            { label: "Request leave", to: "/me/leave" },
          ];

  return (
    <div className="space-y-8">
      <DashboardGreeting
        name={user?.name}
        timeZone={timeZone}
        context={greetingContext}
        actions={greetingActions}
      />

      {canFilter ? (
        <FilterBar
          filters={[
            {
              key: "period",
              label: "Period",
              allLabel: "Custom range",
              value: period,
              onChange: applyPeriod,
              options: PERIODS.map((item) => ({
                value: item.value,
                label: item.label,
              })),
            },
            {
              key: "department",
              label: "Department",
              allLabel: "All departments",
              value: departmentId,
              onChange: setDepartmentId,
              options: departments.map((department) => ({
                value: department.id,
                label: department.name,
              })),
            },
          ]}
          dateRange={{
            from,
            to,
            onFromChange: (value) => {
              setFrom(value);
              setPeriod("");
            },
            onToChange: (value) => {
              setTo(value);
              setPeriod("");
            },
          }}
          onClear={() => {
            setDepartmentId("");
            applyPeriod("month");
          }}
        />
      ) : null}

      {error ? (
        <ErrorState
          title="The dashboard did not load"
          message={error}
          onRetry={reload}
        />
      ) : null}

      {!error && loading && !data ? <DashboardSkeleton /> : null}

      {!error && data ? (
        <>
          {role === "admin" ? (
            <Suspense fallback={<DashboardSkeleton />}>
              <AdminDashboard
                data={data.admin}
                loading={loading}
                error=""
                onRetry={reload}
                filters={{ from, to, departmentId }}
              />
            </Suspense>
          ) : null}

          {role === "hr" ? (
            <>
              <Suspense fallback={<DashboardSkeleton />}>
                <HrDashboard
                  data={data.hr}
                  loading={loading}
                  error=""
                  onRetry={reload}
                />
              </Suspense>
              <SummaryCard filters={{ from, to, departmentId }} />
              <PageSection
                title="My day"
                description="Your own check-in, hours, leave and payslip."
              >
                <MyDay
                  data={data.me}
                  loading={loading}
                  error=""
                  onRetry={reload}
                />
              </PageSection>
            </>
          ) : null}

          {role === "employee" ? (
            <MyDay data={data.me} loading={loading} error="" onRetry={reload} />
          ) : null}

          {role === "admin" ? (
            <SummaryCard filters={{ from, to, departmentId }} />
          ) : null}

          {!role ? (
            <Card className="p-6">
              <EmptyState
                icon={LayoutDashboard}
                title="No dashboard for this account"
                description="Sign in with an admin, HR or employee account."
              />
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
