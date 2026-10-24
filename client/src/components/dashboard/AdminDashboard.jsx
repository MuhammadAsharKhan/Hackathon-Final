import { Link } from "react-router-dom";
import { BarChartBox, LineChartBox, PieChartBox } from "@/components/charts/ChartBoxes";
import DataTable from "@/components/data/DataTable";
import Card from "@/components/ui/Card";
import PageSection from "@/components/ui/PageSection";
import StatCard from "@/components/ui/StatCard";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { formatDateTimeIn, formatMoney, formatRatio } from "@/lib/format";
import { monthLabel } from "@/lib/time";

const GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
  not_set: "Not set",
};

const sumBy = (rows, pick) =>
  rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);

const weightedAverage = (rows) => {
  const headcount = sumBy(rows, (row) => row.headcount);
  if (headcount === 0) return 0;
  return sumBy(rows, (row) => row.averageGross * row.headcount) / headcount;
};

export default function AdminDashboard({ data, loading, error, onRetry, filters }) {
  const timeZone = useCompanyTimeZone();
  const month = filters?.to ? filters.to.slice(0, 7) : "";

  const byMonth = data?.payrollCost?.byMonth || [];
  const byDepartment = data?.payrollCost?.byDepartment || [];
  const currentMonth = byMonth.find((row) => row.month === month);
  const totalFinalized = sumBy(byMonth, (row) => row.net);

  const headcountRows = data?.headcountByDepartment || [];
  const departmentSalary = data?.averageSalary?.byDepartment || [];
  const designationSalary = data?.averageSalary?.byDesignation || [];
  const genderRows = (data?.gender || []).map((row) => ({
    name: GENDER_LABELS[row.gender] || row.gender,
    value: row.count,
  }));
  const tenure = data?.tenure || {};
  const tenureRows = [
    { bucket: "Under 1 year", count: tenure.underOneYear || 0 },
    { bucket: "1 to 3 years", count: tenure.oneToThreeYears || 0 },
    { bucket: "Over 3 years", count: tenure.overThreeYears || 0 },
  ];

  const salaryColumns = (nameHeader, nameKey) => [
    {
      key: "name",
      header: nameHeader,
      render: (row) => row[nameKey] || "Not set",
    },
    {
      key: "headcount",
      header: "People",
      className: "tabular-nums",
      render: (row) => row.headcount,
    },
    {
      key: "average",
      header: "Average gross",
      className: "text-right tabular-nums",
      render: (row) => formatMoney(row.averageGross),
    },
  ];

  const auditColumns = [
    {
      key: "actor",
      header: "Who",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.actorName || "-"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.actorRole || ""}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => <span className="font-mono text-xs">{row.action}</span>,
    },
    {
      key: "when",
      header: "When",
      className: "whitespace-nowrap text-muted-foreground",
      render: (row) => formatDateTimeIn(row.createdAt, timeZone),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Headcount"
          value={loading ? "-" : (data?.headcount?.count ?? 0)}
          hint={data?.headcount?.date ? `On ${data.headcount.date}` : undefined}
        />
        <StatCard
          label="Attrition YTD"
          value={loading ? "-" : formatRatio(data?.attritionYtd?.rate)}
          hint={
            data?.attritionYtd
              ? `${data.attritionYtd.exits} exits this year`
              : undefined
          }
        />
        <StatCard
          label={`Payroll ${month ? monthLabel(month) : "this month"}`}
          value={loading ? "-" : formatMoney(currentMonth?.net ?? 0)}
          hint="Net of finalized runs"
          valueClassName="text-lg"
        />
        <StatCard
          label="Finalized payroll"
          value={loading ? "-" : formatMoney(totalFinalized)}
          hint="Every finalized run in view"
          valueClassName="text-lg"
        />
        <StatCard
          label="Average salary"
          value={loading ? "-" : formatMoney(weightedAverage(departmentSalary))}
          hint="Gross of active people"
          valueClassName="text-lg"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartBox
          title="Headcount by department"
          data={headcountRows}
          xKey="department"
          series={[{ key: "count", label: "People" }]}
          valueFormatter={(value) => `${value}`}
          summary={`Headcount by department. ${headcountRows
            .map((row) => `${row.department} ${row.count}`)
            .join(", ")}.`}
        />
        <BarChartBox
          title="Payroll cost by department"
          data={byDepartment}
          xKey="department"
          series={[{ key: "net", label: "Net pay" }]}
          valueFormatter={(value) => formatMoney(value)}
          summary={`Finalized net pay by department. ${byDepartment
            .map((row) => `${row.department} ${formatMoney(row.net)}`)
            .join(", ")}.`}
        />
        <LineChartBox
          title="Payroll cost by month"
          data={byMonth}
          xKey="month"
          series={[{ key: "net", label: "Net pay" }]}
          valueFormatter={(value) => formatMoney(value)}
          labelFormatter={(value) => monthLabel(value)}
          emptyMessage="Finalize a payroll run to see this line."
          summary={`Finalized net pay by month. ${byMonth
            .map((row) => `${monthLabel(row.month)} ${formatMoney(row.net)}`)
            .join(", ")}.`}
        />
        <PieChartBox
          title="Gender split"
          data={genderRows}
          emptyMessage="No employees in this range."
        />
        <BarChartBox
          title="Tenure"
          data={tenureRows}
          xKey="bucket"
          series={[{ key: "count", label: "People" }]}
          emptyMessage="No employees in this range."
        />
        <Card className="p-5">
          <h2 className="text-base font-semibold tracking-tight">Audit feed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The last ten changes anyone made.
          </p>
          <Link
            to="/admin/audit"
            className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Open the audit log
          </Link>
          <div className="mt-4">
            <DataTable
              columns={auditColumns}
              rows={data?.auditFeed || []}
              minWidthClass="min-w-[24rem]"
              getRowId={(row) => row.id || row._id}
              loading={loading}
              error={error}
              onRetry={onRetry}
              errorTitle="The audit feed did not load"
              empty={{
                title: "Nothing recorded yet",
                description: "Actions show up here as soon as the team starts working.",
              }}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageSection title="Average salary by department" className="min-w-0">
          <DataTable
            columns={salaryColumns("Department", "department")}
            rows={departmentSalary}
            minWidthClass="min-w-[22rem]"
            getRowId={(row) => row.departmentId || row.department}
            loading={loading}
          />
        </PageSection>
        <PageSection title="Average salary by designation" className="min-w-0">
          <DataTable
            columns={salaryColumns("Designation", "designation")}
            rows={designationSalary}
            minWidthClass="min-w-[22rem]"
            getRowId={(row) => row.designationId || row.designation}
            loading={loading}
          />
        </PageSection>
      </div>
    </div>
  );
}
