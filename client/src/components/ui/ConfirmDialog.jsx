import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  error,
  className,
  ...props
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      {...props}
      title={title}
      description={description}
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
