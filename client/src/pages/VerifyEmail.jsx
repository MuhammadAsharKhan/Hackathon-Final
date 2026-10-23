import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import OtpInput from "@/components/ui/OtpInput";
import { resendVerification } from "@/api/auth.api";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResendCountdown } from "@/hooks/useResendCountdown";
import { getErrorMessage } from "@/lib/errors";
import { redirectPath } from "@/lib/navigation";
import {
  clearPendingEmail,
  readPendingEmail,
} from "@/lib/pendingVerification";

const RESEND_SECONDS = 60;

export default function VerifyEmail() {
  useDocumentTitle("Verify email");
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(readPendingEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const { countdown, restart } = useResendCountdown(RESEND_SECONDS);
  const mountedRef = useMountedRef();

  useEffect(() => {
    restart();
  }, [restart]);

  if (!email) return <Navigate to="/register" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (verifying) return;

    if (code.length !== 6) {
      setError("Enter the six digit code");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      await verifyEmail({ email, otp: code });
      if (!mountedRef.current) return;
      clearPendingEmail();
      toast.success("Email verified");
      navigate(redirectPath(location), { replace: true });
    } catch (failure) {
      if (!mountedRef.current) return;
      setCode("");
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || countdown > 0) return;

    setResending(true);
    setError("");

    try {
      await resendVerification(email);
      if (!mountedRef.current) return;
      restart();
      toast.success("Code sent");
    } catch (failure) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setResending(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Verify email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the six digit code sent to {email}.
      </p>
      {location.state?.notice ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {location.state.notice}
        </p>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <OtpInput
          value={code}
          onChange={(nextCode) => {
            setCode(nextCode);
            setError("");
          }}
          disabled={verifying}
          error={Boolean(error)}
        />

        <FormError bordered>{error}</FormError>

        <Button type="submit" className="w-full" loading={verifying}>
          Verify
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-10 px-0 text-xs"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          loading={resending}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
        </Button>
        <Link
          to="/register"
          state={location.state}
          onClick={clearPendingEmail}
          className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
        >
          Use a different email
        </Link>
      </div>
    </Card>
  );
}
