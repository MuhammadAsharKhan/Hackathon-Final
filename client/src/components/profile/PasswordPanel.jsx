import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmailVerificationFlow from "@/components/auth/EmailVerificationFlow";
import { PASSWORD_HINT } from "@/lib/validation";

export default function PasswordPanel({
  user,
  passwords,
  errors,
  formError,
  saving,
  verified,
  showCurrentPassword,
  verifyOpen,
  onChange,
  onSubmit,
  onOpenVerification,
  onCloseVerification,
  onVerified,
}) {
  return (
    <>
      <Card className="max-w-xl p-6">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {user?.hasPassword ? null : (
            <p className="text-sm text-muted-foreground">
              This account has no password yet. Verify your email to set one.
            </p>
          )}

          {showCurrentPassword ? (
            <>
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={onChange("currentPassword")}
                error={errors.currentPassword}
              />
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-10 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={onOpenVerification}
                >
                  Reset password
                </Button>
              </div>
            </>
          ) : verified ? (
            <Input
              label="Current password"
              value="Verified via email"
              disabled
              readOnly
              className="bg-surface text-muted-foreground"
            />
          ) : (
            <Button variant="secondary" onClick={onOpenVerification}>
              Verify via email
            </Button>
          )}

          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={onChange("newPassword")}
            error={errors.newPassword}
            hint={PASSWORD_HINT}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={passwords.confirm}
            onChange={onChange("confirm")}
            error={errors.confirm}
          />

          <FormError>{formError}</FormError>

          <Button type="submit" loading={saving}>
            Save password
          </Button>
        </form>
      </Card>

      <Modal
        open={verifyOpen}
        onClose={onCloseVerification}
        title="Verify your email"
        description="We will email a six digit code to confirm it is you."
      >
        <EmailVerificationFlow
          initialEmail={user?.email || ""}
          lockEmail
          onVerified={onVerified}
        />
      </Modal>
    </>
  );
}
