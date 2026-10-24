import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, Lock } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import PayslipDrawer from "@/components/payroll/PayslipDrawer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader from "@/components/ui/PageHeader";
import PageLoading from "@/components/ui/PageLoading";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  createPayrollRun,
  finalizePayrollRun,
  getPayrollRun,
} from "@/api/payroll.api";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useConfirm } from "@/hooks/useConfirm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTimeIn, formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/time";

const altTextOf = (payslip) =>
  `${payslip.snapshot?.employeeName ?? "Payslip"} for ${monthLabel(payslip.month)}`;

export default function PayrollRun() {
  const { id } = useParams();
  const { user } = useAuth();
  const timeZone = useCompanyTimeZone();
  const [selected, setSelected] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const { data, loading, error, reload } = useResource(() => getPayrollRun(id), [id]);
  const { ask, dialogProps } = useConfirm();

  const run = data?.run;
  const payslips = data?.payslips || [];
  const isDraft = run?.status === "draft";
  const isHr = user?.role === "hr";
  const isAdmin = user?.role === "admin";

  useDocumentTitle(run ? `Payroll - ${monthLabel(run.month)}` : "Payroll run");

  const recalculate = () => {
    ask({
      title: "Recalculate this draft?",
      description:
        "Every payslip in the month is rebuilt from the current attendance, leave and salary records. Any manual fixup is lost.",
      confirmLabel: "Recalculate",
      run: async () => {
        setRecalculating(true);
        try {
          await createPayrollRun(run.month);
          toast.success("Draft recalculated");
          reload();
        } catch (failure) {
          toast.error(getErrorMessage(failure));
          reload();
        } finally {
          setRecalculating(false);
        }
      },
    });
  };

  const finalize = () => {
    ask({
      title: "Finalize this month?",
      description:
        "Finalizing locks the month for everybody. Payslips become visible to employees and the run cannot be recalculated or edited again.",
      confirmLabel: "Finalize",
      run: async () => {
        try {
          await finalizePayrollRun(run.id);
          toast.success("Payroll finalized");
          reload();
        } catch (failure) {
          toast.error(getErrorMessage(failure));
          reload();
        }
      },
    });
  };

  const columns = [
    {
      key: "employee",
      header: "Employee",
      render: (payslip) => (
        <div className="min-w-0">
          <p className="font-medium">{payslip.snapshot?.employeeName}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {payslip.snapshot?.employeeCode}
          </p>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      className: "whitespace-nowrap",
      render: (payslip) => payslip.snapshot?.department || "-",
    },
    {
      key: "eligibleDays",
      header: "Eligible",
      className: "tabular-nums",
      render: (payslip) => payslip.eligibleDays,
    },
    {
      key: "absentDays",
      header: "Absent",
      className: "tabular-nums",
      render: (payslip) => payslip.absentDays,
    },
    {
      key: "unpaidDays",
      header: "Unpaid",
      className: "tabular-nums",
      render: (payslip) => payslip.unpaidDays,
    },
    {
      key: "halfDays",
      header: "Half",
      className: "tabular-nums",
      render: (payslip) => payslip.halfDays,
    },
    {
      key: "gross",
      header: "Gross",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (payslip) => formatMoney(payslip.gross),
    },
    {
      key: "deduction",
      header: "Deduction",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (payslip) => formatMoney(payslip.attendanceDeduction),
    },
    {
      key: "tax",
      header: "Tax",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (payslip) => formatMoney(payslip.tax),
    },
    {
      key: "net",
      header: "Net",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (payslip) => formatMoney(payslip.netPay),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          to="/payroll"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All runs
        </Link>
        <Card className="p-6">
          <p className="text-sm font-medium">This run did not load</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={reload}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/payroll"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All runs
      </Link>

      <PageHeader
        title={`Payroll - ${monthLabel(run.month)}`}
        description={
          isDraft
            ? "Draft. Employees cannot see these payslips yet."
            : `Finalized ${run.finalizedAt ? formatDateTimeIn(run.finalizedAt, timeZone) : ""}. The month is locked.`
        }
        actions={
          <>
            <StatusBadge kind="payroll" status={run.status} />
            {isHr && isDraft ? (
              <Button variant="secondary" onClick={recalculate} loading={recalculating}>
                <Calculator className="h-4 w-4" aria-hidden="true" />
                Recalculate
              </Button>
            ) : null}
            {isAdmin && isDraft ? (
              <Button onClick={finalize}>
                <Lock className="h-4 w-4" aria-hidden="true" />
                Finalize
              </Button>
            ) : null}
          </>
        }
      />

      {isDraft && isHr ? (
        <Card className="border-dashed p-4">
          <p className="text-sm font-medium">Draft, not visible to employees</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Recalculate as often as you need. Once the Admin finalizes the month, it
            locks for good.
          </p>
        </Card>
      ) : null}

      {!isDraft ? (
        <Card className="border-success/40 bg-surface-tint p-4">
          <p className="text-sm font-medium">Finalized</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The payslips are visible to employees and the month can no longer be
            recalculated.
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Employees" value={run.totals?.employees ?? 0} />
        <StatCard
          label="Gross"
          value={formatMoney(run.totals?.gross)}
          valueClassName="text-lg"
        />
        <StatCard
          label="Deductions"
          value={formatMoney(run.totals?.deductions)}
          valueClassName="text-lg"
        />
        <StatCard label="Tax" value={formatMoney(run.totals?.tax)} valueClassName="text-lg" />
        <StatCard label="Net" value={formatMoney(run.totals?.net)} valueClassName="text-lg" />
      </div>

      <DataTable
        columns={columns}
        rows={payslips}
        onRowClick={(payslip) => setSelected(payslip)}
        empty={{
          title: "No payslips in this run",
          description:
            "Nobody was eligible this month. Recalculate after checking join dates and salaries.",
        }}
      />

      {selected ? (
        <PayslipDrawer
          key={selected.id}
          open
          payslip={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}

      <ConfirmDialog {...dialogProps} />
      <p className="sr-only">
        {payslips.length} payslips. {payslips.map(altTextOf).join(". ")}
      </p>
    </div>
  );
}
