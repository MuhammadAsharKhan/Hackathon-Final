import { useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { downloadPayslipPdf } from "@/api/payslips.api";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/time";

const percentOf = (part, whole) =>
  whole ? `${Math.round(((part / whole) * 100 + Number.EPSILON) * 10) / 10}%` : "-";

function LineRow({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={strong ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${strong ? "text-sm font-medium" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}

export function PayslipPdfButton({ payslipId, month, className }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const file = await downloadPayslipPdf(payslipId, month);
      saveBlob(file.blob, file.filename);
      toast.success("Payslip downloaded");
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      loading={busy}
      onClick={download}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      PDF
    </Button>
  );
}

export default function PayslipDrawer({ payslip, open, onClose }) {
  if (!payslip) return null;

  const snapshot = payslip.snapshot ?? {};
  const month = payslip.month;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      title={snapshot.employeeName || "Payslip"}
      description={`${snapshot.employeeCode || ""} ${snapshot.department ? `- ${snapshot.department}` : ""} ${month ? `- ${monthLabel(month)}` : ""}`.trim()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <PayslipPdfButton payslipId={payslip.id} month={month} />
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-surface-tint p-4">
          <p className="text-xs font-medium text-muted-foreground">Net pay</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(payslip.netPay)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {snapshot.designation ? `${snapshot.designation}. ` : ""}
            Finalized payslips never change, even if salary changes later.
          </p>
        </section>

        <section>
          <h3 className="text-sm font-medium">Days</h3>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <LineRow label="Working days" value={payslip.workingDays} />
            <LineRow label="Eligible days" value={payslip.eligibleDays} />
            <LineRow label="Absent" value={payslip.absentDays} />
            <LineRow label="Unpaid leave" value={payslip.unpaidDays} />
            <LineRow label="Half days" value={payslip.halfDays} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium">Earnings</h3>
          <div className="mt-2 divide-y divide-border">
            <LineRow label="Basic" value={formatMoney(payslip.basic)} />
            <LineRow
              label={`House rent (${percentOf(payslip.hra, payslip.basic)})`}
              value={formatMoney(payslip.hra)}
            />
            <LineRow
              label={`Medical (${percentOf(payslip.medical, payslip.basic)})`}
              value={formatMoney(payslip.medical)}
            />
            <LineRow label="Gross" value={formatMoney(payslip.gross)} strong />
            <LineRow label="Earned gross" value={formatMoney(payslip.earnedGross)} strong />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium">Deductions</h3>
          <div className="mt-2 divide-y divide-border">
            <LineRow label="Absent days" value={formatMoney(payslip.absentDeduction)} />
            <LineRow label="Unpaid leave" value={formatMoney(payslip.unpaidDeduction)} />
            <LineRow label="Half days" value={formatMoney(payslip.halfDayDeduction)} />
            <LineRow
              label="Attendance deduction"
              value={formatMoney(payslip.attendanceDeduction)}
              strong
            />
            <LineRow label="Income tax" value={formatMoney(payslip.tax)} strong />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium">How this was calculated</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>
              Gross = basic x (1 + house rent percent + medical percent) ={" "}
              {formatMoney(payslip.gross)}
            </li>
            <li>
              Per day = gross / working days = {formatMoney(payslip.perDay)} for{" "}
              {payslip.workingDays} working days
            </li>
            <li>
              Earned gross = per day x eligible days ({payslip.eligibleDays}) ={" "}
              {formatMoney(payslip.earnedGross)}
            </li>
            <li>
              Attendance deduction = per day x (absent + unpaid + half of the half days) ={" "}
              {formatMoney(payslip.attendanceDeduction)}
            </li>
            <li>
              Tax = yearly tax on 12 months of gross, spread over the eligible days ={" "}
              {formatMoney(payslip.tax)} (yearly {formatMoney(payslip.annualTax)})
            </li>
            <li>
              Net pay = earned gross - attendance deduction - tax ={" "}
              {formatMoney(payslip.netPay)}
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
