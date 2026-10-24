import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Textarea from "@/components/ui/Textarea";
import { decideCorrection, getEmployeeMonth } from "@/api/attendance.api";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { formatClock } from "@/lib/time";

const findDay = (month, date) => month?.days?.find((day) => day.date === date) || null;

const TimeRow = ({ label, checkIn, checkOut, timeZone }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm tabular-nums">
      {formatClock(checkIn, timeZone)} to {formatClock(checkOut, timeZone)}
    </span>
  </div>
);

export default function CorrectionDecisionModal({
  open,
  correction,
  decision,
  onClose,
  onDecided,
}) {
  const timeZone = useCompanyTimeZone();
  const mountedRef = useMountedRef();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: month, loading: monthLoading } = useResource(
    () =>
      correction
        ? getEmployeeMonth(correction.employeeId, correction.date.slice(0, 7))
        : Promise.resolve(null),
    [correction?.id]
  );

  const currentRecord = findDay(month, correction?.date)?.record || null;
  const rejecting = decision === "reject";

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (rejecting && !comment.trim()) {
      setError("A comment is required to reject a correction");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await decideCorrection(correction.id, {
        decision,
        comment: comment.trim() || undefined,
      });
      if (!mountedRef.current) return;
      onDecided(result);
    } catch (failure) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={rejecting ? "Reject correction" : "Approve correction"}
      description={
        correction
          ? `${correction.employeeName || "Employee"} for ${formatDate(correction.date)}`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={rejecting ? "danger" : "primary"}
            onClick={handleSubmit}
            loading={saving}
          >
            {rejecting ? "Reject" : "Approve"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          {monthLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Loading the stored times
            </div>
          ) : (
            <>
              <TimeRow
                label="Stored"
                checkIn={currentRecord?.checkIn}
                checkOut={currentRecord?.checkOut}
                timeZone={timeZone}
              />
              <TimeRow
                label="Requested"
                checkIn={correction?.requestedCheckIn}
                checkOut={correction?.requestedCheckOut}
                timeZone={timeZone}
              />
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-xs text-muted-foreground">Reason from the employee</p>
          <p className="mt-1 text-sm">{correction?.reason || "-"}</p>
        </div>

        <Textarea
          label="Comment"
          rows={3}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            setError("");
          }}
          hint={
            rejecting
              ? "Required. The employee reads this in the notification."
              : "Optional. The employee reads this in the notification."
          }
        />

        <FormError>{error}</FormError>
      </div>
    </Modal>
  );
}
