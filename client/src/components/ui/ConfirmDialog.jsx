import { useEffect, useRef } from "react";
import Button from "./Button";
import Modal from "./Modal";

/**
 * Destructive actions use the danger button, and focus lands on Cancel so a
 * stray Enter does not delete anything.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  error,
  tone = "danger",
  className,
  ...props
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      {...props}
      title={title}
      description={description}
      intent={tone === "danger" ? "danger" : "info"}
      className={className}
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-text-2">
          This action cannot be undone.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-status-rose">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
