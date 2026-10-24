import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import Modal from "@/components/ui/Modal";

export default function TemporaryPasswordModal({
  open,
  onClose,
  title = "Temporary password",
  accountName,
  password,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        accountName
          ? `Share this password with ${accountName}. It is shown once.`
          : "Share this password with the person. It is shown once."
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <code className="flex-1 break-all font-mono text-sm">{password}</code>
          <CopyButton value={password} label="Copy temporary password" announce />
        </div>

        <p className="text-xs text-muted-foreground">
          The account must change this password at the first sign in. Closing
          this dialog removes the password from this screen.
        </p>
      </div>
    </Modal>
  );
}
