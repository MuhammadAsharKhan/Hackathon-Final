import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { decideLeave } from "@/api/leave.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage } from "@/lib/errors";
import { formatDateRange } from "@/lib/format";

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-right text-sm">{value}</span>
  </div>
);

export default function LeaveDecisionModal({ open, request, decision, onClose, onDecided }) {
  const mountedRef = useMountedRef();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const rejecting = decision === "reject";

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (rejecting && !comment.trim()) {
      setError("A comment is required to reject a leave request");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await decideLeave(request.id, {
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
      title={rejecting ? "Reject leave" : "Approve leave"}
      description={
        request
          ? `${request.employeeName || "Employee"} · ${request.leaveTypeName || request.leaveTypeCode}`
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
          <Row
            label="Dates"
            value={request ? formatDateRange(request.startDate, request.endDate) : "-"}
          />
          <Row label="Working days" value={request?.days ?? "-"} />
          <Row label="Reason" value={request?.reason || "-"} />
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
