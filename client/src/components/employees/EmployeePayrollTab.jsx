import { useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { downloadPayslipPdf } from "@/api/payslips.api";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/time";

const percentOf = (basic, percent) =>
  ((Number(basic) || 0) * (Number(percent) || 0)) / 100;

const SalaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="tabular-nums">{formatMoney(value)}</span>
  </div>
);

export default function EmployeePayrollTab({
  employee,
  payslips = [],
  canViewSalary,
  canEditSalary,
  onEditSalary,
}) {
  const [downloading, setDownloading] = useState("");

  const basic = Number(employee?.basicSalary) || 0;
  const hra = percentOf(basic, employee?.hraPercent);
  const medical = percentOf(basic, employee?.medicalPercent);
  const gross = basic + hra + medical;

  const handlePdf = async (payslip) => {
    if (downloading) return;
    setDownloading(payslip.id);

    try {
      const download = await downloadPayslipPdf(payslip.id, payslip.month);
      saveBlob(download.blob, download.filename);
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    } finally {
      setDownloading("");
    }
  };

  const columns = [
    {
      key: "month",
      header: "Month",
      render: (payslip) => monthLabel(payslip.month),
    },
    {
      key: "gross",
      header: "Gross",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (payslip) => formatMoney(payslip.gross),
    },
    {
      key: "deduction",
      header: "Attendance deduction",
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
      key: "netPay",
      header: "Net pay",
      className: "whitespace-nowrap text-right font-medium tabular-nums",
      render: (payslip) => formatMoney(payslip.netPay),
    },
    {
      key: "pdf",
      header: "",
      className: "w-24 text-right",
      render: (payslip) => (
        <Button
          variant="ghost"
          size="sm"
          loading={downloading === payslip.id}
          onClick={(event) => {
            event.stopPropagation();
            handlePdf(payslip);
          }}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {canViewSalary ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Salary structure
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Monthly amounts in PKR before deductions.
              </p>
            </div>
            {canEditSalary ? (
              <Button variant="secondary" size="sm" onClick={onEditSalary}>
                Edit salary
              </Button>
            ) : null}
          </div>

          <div className="mt-3 max-w-md">
            <SalaryRow label="Basic" value={basic} />
            <SalaryRow
              label={`House rent (${employee?.hraPercent ?? 0}%)`}
              value={hra}
            />
            <SalaryRow
              label={`Medical (${employee?.medicalPercent ?? 0}%)`}
              value={medical}
            />
            <div className="flex items-center justify-between gap-3 py-2 text-sm font-medium">
              <span>Gross per month</span>
              <span className="tabular-nums">{formatMoney(gross)}</span>
            </div>
          </div>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        rows={payslips}
        empty={{
          title: "No finalized payslips yet",
          description: "A payslip appears here once its month is finalized.",
        }}
      />
    </div>
  );
}
