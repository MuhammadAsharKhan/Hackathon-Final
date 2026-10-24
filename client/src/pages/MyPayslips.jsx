import DataTable from "@/components/data/DataTable";
import { PayslipPdfButton } from "@/components/payroll/PayslipDrawer";
import PageHeader from "@/components/ui/PageHeader";
import { listMyPayslips } from "@/api/payroll.api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/time";

export default function MyPayslips() {
  useDocumentTitle("My payslips");

  const { data, loading, error, reload } = useResource(() => listMyPayslips(), []);
  const payslips = data?.payslips || [];

  const columns = [
    {
      key: "month",
      header: "Month",
      render: (payslip) => (
        <span className="font-medium">{monthLabel(payslip.month)}</span>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (payslip) => formatMoney(payslip.gross),
    },
    {
      key: "deductions",
      header: "Deductions",
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
      render: (payslip) => (
        <span className="font-medium">{formatMoney(payslip.netPay)}</span>
      ),
    },
    {
      key: "pdf",
      header: "",
      className: "text-right",
      render: (payslip) => (
        <PayslipPdfButton payslipId={payslip.id} month={payslip.month} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My payslips"
        description="Only finalized payslips appear here. The PDF is the same document payroll keeps."
      />

      <DataTable
        columns={columns}
        rows={payslips}
        loading={loading}
        error={error}
        errorTitle="Your payslips did not load"
        onRetry={reload}
        empty={{
          title: "No payslips yet",
          description:
            "A payslip appears here after the Admin finalizes the month it belongs to.",
        }}
      />
    </div>
  );
}
