import { Link } from "react-router-dom";
import CheckInPanel from "@/components/attendance/CheckInPanel";
import { BarChartBox, LineChartBox } from "@/components/charts/ChartBoxes";
import DataTable from "@/components/data/DataTable";
import Card from "@/components/ui/Card";
import PageSection from "@/components/ui/PageSection";
import StatCard from "@/components/ui/StatCard";
import { formatDate, formatRatio } from "@/lib/format";

const percentTick = (value) => `${Math.round(Number(value) || 0)}%`;

export default function HrDashboard({ data, loading, error, onRetry }) {
  const pending = data?.pendingApprovals || { leave: 0, corrections: 0 };

  const trendRows = (data?.attendanceTrend || []).map((row) => ({
    ...row,
    percent: Math.round((Number(row.rate) || 0) * 1000) / 10,
  }));

  const absenteeismRows = (data?.absenteeismByDepartment || []).map((row) => ({
    ...row,
    percent: Math.round((Number(row.absenteeism) || 0) * 1000) / 10,
  }));

  const leaveRows = data?.leaveByType || [];
  const lateRows = data?.topLateComers || [];
  const utilizationRows = (data?.leaveUtilization || []).filter(
    (row) => row.headcount > 0
  );

  const lateColumns = [
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {row.code} {row.department ? `- ${row.department}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "lateDays",
      header: "Late days",
      className: "text-right tabular-nums",
      render: (row) => row.lateDays,
    },
  ];

  const utilizationColumns = [
    {
      key: "type",
      header: "Leave type",
      render: (row) => row.typeName,
    },
    {
      key: "department",
      header: "Department",
      render: (row) => row.department,
    },
    {
      key: "days",
      header: "Days taken",
      className: "tabular-nums",
      render: (row) => row.days,
    },
    {
      key: "utilization",
      header: "Utilization",
      className: "text-right tabular-nums",
      render: (row) =>
        row.utilization === null ? "No quota" : formatRatio(row.utilization / 100),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Headcount" value={loading ? "-" : data?.headcount ?? 0} />
        <StatCard label="Present today" value={loading ? "-" : data?.presentToday ?? 0} />
        <StatCard label="On leave today" value={loading ? "-" : data?.onLeaveToday ?? 0} />
        <StatCard label="Late today" value={loading ? "-" : data?.lateToday ?? 0} />
      </div>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Pending approvals</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading"
              : `${pending.leave} leave request(s) and ${pending.corrections} attendance correction(s)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            to="/leave/requests"
            className="text-primary underline-offset-4 hover:underline"
          >
            Leave inbox
          </Link>
          <span className="text-border" aria-hidden="true">
            |
          </span>
          <Link
            to="/attendance?tab=corrections"
            className="text-primary underline-offset-4 hover:underline"
          >
            Correction inbox
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartBox
          title="Attendance trend"
          description="Share of expected days that were worked."
          data={trendRows}
          xKey="date"
          series={[{ key: "percent", label: "Attendance" }]}
          valueFormatter={percentTick}
          labelFormatter={(value) => formatDate(value)}
          emptyMessage="No working days in this range yet."
          summary={`Attendance trend. ${trendRows
            .map((row) => `${formatDate(row.date)} ${percentTick(row.percent)}`)
            .join(", ")}.`}
        />
        <BarChartBox
          title="Absenteeism by department"
          data={absenteeismRows}
          xKey="department"
          series={[{ key: "percent", label: "Absent days" }]}
          valueFormatter={percentTick}
          emptyMessage="No expected days in this range."
        />
        <BarChartBox
          title="Leave by type"
          description="Approved days that start inside the range."
          data={leaveRows}
          xKey="name"
          series={[{ key: "days", label: "Days" }]}
          emptyMessage="No leave starts in this range."
        />
        <PageSection title="Top late-comers" className="min-w-0">
          <DataTable
            columns={lateColumns}
            rows={lateRows}
            minWidthClass="min-w-[24rem]"
            getRowId={(row) => row.employeeId}
            loading={loading}
            error={error}
            onRetry={onRetry}
            errorTitle="The late-comers list did not load"
            empty={{
              title: "Nobody was late",
              description: "No late check-ins in this range.",
            }}
          />
        </PageSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageSection
          title="Leave utilization"
          description="Approved days against the yearly quota per department."
          className="min-w-0"
        >
          <DataTable
            columns={utilizationColumns}
            rows={utilizationRows}
            minWidthClass="min-w-[24rem]"
            getRowId={(row) => `${row.typeCode}-${row.departmentId || "none"}`}
            loading={loading}
            empty={{
              title: "Nothing to show",
              description: "Create departments and leave types to see utilization.",
            }}
          />
        </PageSection>

        <PageSection
          title="My attendance"
          description="Your own check-in, so you do not need the personal pages for it."
          className="min-w-0"
        >
          <CheckInPanel />
        </PageSection>
      </div>
    </div>
  );
}
