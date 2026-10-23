import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmailVerificationFlow from "./EmailVerificationFlow";
import { resetPassword } from "@/api/auth.api";
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
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setStep("verify");
    setResetToken("");
    setValues(EMPTY_FORM);
    setErrors({});
    setFormError("");
    setSaving(false);
  }, [open]);

  const finish = () => {
    toast.success("Password updated. Sign in with your new password.");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    const passwordError = validatePassword(values.password);
    if (passwordError) nextErrors.password = passwordError;

    if (values.password !== values.confirm) {
      nextErrors.confirm = "Passwords do not match";
    }

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      await resetPassword({ resetToken, newPassword: values.password });
      finish();
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setFormError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
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
            value={values.password}
            onChange={(event) => {
              setValues((previous) => ({
                ...previous,
                password: event.target.value,
              }));
              setErrors((previous) => ({ ...previous, password: undefined }));
            }}
            error={errors.password}
            hint={PASSWORD_HINT}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={(event) => {
              setValues((previous) => ({
                ...previous,
                confirm: event.target.value,
              }));
              setErrors((previous) => ({ ...previous, confirm: undefined }));
            }}
            error={errors.confirm}
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
