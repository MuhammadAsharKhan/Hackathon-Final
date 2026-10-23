import { useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import OtpInput from "@/components/ui/OtpInput";
import { forgotPassword, verifyOtp } from "@/api/auth.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResendCountdown } from "@/hooks/useResendCountdown";
import { getErrorMessage } from "@/lib/errors";
import { EMAIL_PATTERN } from "@/lib/validation";

const RESEND_SECONDS = 60;
const SENT_MESSAGE = "If this email has an account, a code was sent.";

export default function EmailVerificationFlow({
  initialEmail = "",
  lockEmail = false,
  onVerified,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { countdown, restart, clear } = useResendCountdown(RESEND_SECONDS);
  const mountedRef = useMountedRef();

  const sendCode = async (event) => {
    event?.preventDefault();
    if (sending) return;
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email");
      return;
    }

    setSending(true);
    setError("");

    try {
      await forgotPassword(normalizedEmail);
      if (!mountedRef.current) return;
      setEmail(normalizedEmail);
      setStep("code");
      setCode("");
      restart();
    } catch (failure) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    if (verifying) return;

    if (code.length !== 6) {
      setError("Enter the six digit code");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const verification = await verifyOtp({ email, otp: code });
      if (!mountedRef.current) return;
      onVerified(verification.resetToken);
    } catch (failure) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  if (step === "email") {
    return (
      <form className="space-y-4" onSubmit={sendCode} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          error={error}
          disabled={lockEmail || sending}
        />
        <Button type="submit" className="w-full" loading={sending}>
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={verify} noValidate>
      <p className="text-sm text-muted-foreground">{SENT_MESSAGE}</p>
      <p className="text-sm">
        Enter the six digit code sent to{" "}
        <span className="text-foreground">{email}</span>.
      </p>

      <OtpInput
        value={code}
        onChange={(nextCode) => {
          setCode(nextCode);
          setError("");
        }}
        disabled={verifying}
        error={Boolean(error)}
      />

      <FormError>{error}</FormError>

      <Button type="submit" className="w-full" loading={verifying}>
        Verify code
      </Button>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-10"
          onClick={sendCode}
          disabled={countdown > 0 || sending}
          loading={sending}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
        </Button>
        {lockEmail ? null : (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-10"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
              clear();
            }}
          >
            Change email
          </Button>
        )}
      </div>
    </form>
  );
}
