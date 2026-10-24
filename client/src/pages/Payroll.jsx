import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calculator } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import MonthInput from "@/components/ui/MonthInput";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { createPayrollRun, listPayrollRuns } from "@/api/payroll.api";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTimeIn, formatMoney } from "@/lib/format";
import { deviceMonth, monthLabel } from "@/lib/time";

const PAGE_SIZE = 10;

export default function Payroll() {
  useDocumentTitle("Payroll");
  const navigate = useNavigate();
  const { user } = useAuth();
  const timeZone = useCompanyTimeZone();
  const isHr = user?.role === "hr";

  const [month, setMonth] = useState(deviceMonth());
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useResource(
    () => listPayrollRuns({ page, limit: PAGE_SIZE }),
    [page]
  );

  const createDraft = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const result = await createPayrollRun(month);
      toast.success(
        result?.run?.totals?.employees === 0
          ? "Draft created, but nobody was eligible this month"
          : "Payroll draft is ready"
      );
      reload();
      if (result?.run?.id) navigate(`/payroll/${result.run.id}`);
    } catch (failure) {
      toast.error(getErrorMessage(failure));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "month",
      header: "Month",
      render: (run) => (
        <Link
          to={`/payroll/${run.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {monthLabel(run.month)}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (run) => <StatusBadge kind="payroll" status={run.status} />,
    },
    {
      key: "employees",
      header: "Employees",
      className: "tabular-nums",
      render: (run) => run.totals?.employees ?? 0,
    },
    {
      key: "gross",
      header: "Gross",
      className: "text-right tabular-nums",
      render: (run) => formatMoney(run.totals?.gross),
    },
    {
      key: "deductions",
      header: "Deductions",
      className: "text-right tabular-nums",
      render: (run) => formatMoney(run.totals?.deductions),
    },
    {
      key: "tax",
      header: "Tax",
      className: "text-right tabular-nums",
      render: (run) => formatMoney(run.totals?.tax),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right tabular-nums",
      render: (run) => formatMoney(run.totals?.net),
    },
    {
      key: "finalized",
      header: "Finalized",
      className: "whitespace-nowrap text-muted-foreground",
      render: (run) =>
        run.finalizedAt ? formatDateTimeIn(run.finalizedAt, timeZone) : "Not yet",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="One run per month. HR builds the draft, the Admin finalizes it and the month locks."
      />

      {isHr ? (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <MonthInput
              label="Month"
              hint="A future month cannot be paid."
              value={month}
              max={deviceMonth()}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
          <Button
            onClick={createDraft}
            loading={busy}
            disabled={!month}
            className="w-full sm:w-auto"
          >
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Create or recalculate draft
          </Button>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        rows={data?.runs || []}
        loading={loading}
        error={error}
        errorTitle="Payroll runs did not load"
        onRetry={reload}
        empty={{
          title: "No payroll runs yet",
          description: isHr
            ? "Pick a month above and create the first draft."
            : "HR creates the draft. It appears here once it exists.",
        }}
        pagination={
          data?.pagination
            ? {
                page: data.pagination.page,
                pages: data.pagination.pages,
                total: data.pagination.total,
                onChange: setPage,
                itemLabel: "runs",
                itemLabelSingular: "run",
                disabled: loading,
              }
            : undefined
        }
      />
    </div>
  );
}
