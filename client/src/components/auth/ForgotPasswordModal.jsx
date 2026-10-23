import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmailVerificationFlow from "./EmailVerificationFlow";
import { resetPassword } from "@/api/auth.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { PASSWORD_HINT, validatePassword } from "@/lib/validation";

const EMPTY_FORM = { password: "", confirm: "" };

export default function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}) {
  const [step, setStep] = useState("verify");
  const [resetToken, setResetToken] = useState("");
  const [passwords, setPasswords] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const mountedRef = useMountedRef();

  useEffect(() => {
    if (!open) return;

    setStep("verify");
    setResetToken("");
    setPasswords(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setSaving(false);
  }, [open]);

  const updatePasswordField = (field) => (event) => {
    setPasswords((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const finishReset = () => {
    toast.success("Password updated. Sign in with your new password.");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = {};
    const passwordError = validatePassword(passwords.password);
    if (passwordError) nextErrors.password = passwordError;
    if (passwords.password !== passwords.confirm) {
      nextErrors.confirm = "Passwords do not match";
    }

    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      await resetPassword({
        resetToken,
        newPassword: passwords.password,
      });
      if (!mountedRef.current) return;
      finishReset();
    } catch (requestError) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(requestError));
      setFormError(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleVerified = (token) => {
    setResetToken(token);
    setStep("password");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset password"
      description={
        step === "verify"
          ? "We will email a six digit code to confirm it is you."
          : "Choose a new password for your account."
      }
    >
      {step === "verify" ? (
        <EmailVerificationFlow
          initialEmail={initialEmail}
          onVerified={handleVerified}
        />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={passwords.password}
            onChange={updatePasswordField("password")}
            error={fieldErrors.password}
            hint={PASSWORD_HINT}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={passwords.confirm}
            onChange={updatePasswordField("confirm")}
            error={fieldErrors.confirm}
          />

          <FormError bordered>{formError}</FormError>

          <Button type="submit" className="w-full" loading={saving}>
            Save password
          </Button>
        </form>
      )}
    </Modal>
  );
}
