import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, Lock, Mail, UserRound } from "lucide-react";
import PasswordStrength from "@/components/auth/PasswordStrength";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { cn } from "@/lib/cn";
import { completeSetup } from "@/api/setup.api";
import { useSetup } from "@/context/SetupContext";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";

const EMPTY_FORM = {
  companyName: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  confirm: "",
};

export default function Setup() {
  useDocumentTitle("Company setup");

  const { applySession, user } = useAuth();
  const { setupComplete, markComplete } = useSetup();
  const navigate = useNavigate();
  const mountedRef = useMountedRef();
  const finishedRef = useRef(false);

  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState("forward");
  const [done, setDone] = useState(false);

  // A completed setup has no form to show. The flag keeps this page quiet for
  // the moment between the setup request and the navigation to the company tab.
  if (setupComplete && !finishedRef.current) {
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
  }

  useEffect(() => {
    if (!done) return;

    const timer = setTimeout(() => {
      navigate("/admin/organization", { replace: true });
      toast.success("Setup complete");
    }, 700);

    return () => clearTimeout(timer);
  }, [done, navigate]);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const goToStepTwo = (event) => {
    event.preventDefault();
    if (values.companyName.trim().length < 2) {
      setFieldErrors({ companyName: "Company name must be at least 2 characters" });
      return;
    }

    setFieldErrors({});
    setDirection("forward");
    setStep(2);
  };

  const goBack = () => {
    setDirection("back");
    setStep(1);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {};
    const nameError = validateName(values.adminName);
    if (nameError) nextErrors.adminName = nameError;
    const emailError = validateEmail(values.adminEmail);
    if (emailError) nextErrors.adminEmail = emailError;
    const passwordError = validatePassword(values.adminPassword);
    if (passwordError) nextErrors.adminPassword = passwordError;
    if (values.adminPassword !== values.confirm) {
      nextErrors.confirm = "Passwords do not match";
    }

    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const session = await completeSetup({
        companyName: values.companyName.trim(),
        adminName: values.adminName.trim(),
        adminEmail: values.adminEmail.trim(),
        adminPassword: values.adminPassword,
      });
      if (!mountedRef.current) return;

      finishedRef.current = true;
      applySession(session);
      markComplete();
      setDone(true);
    } catch (error) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle
            className="check-draw"
            cx="28"
            cy="28"
            r="25"
            fill="none"
            stroke="#88C443"
            strokeWidth="3"
          />
          <path
            className="check-draw"
            d="M17 29l7 7 15-16"
            fill="none"
            stroke="#4F8A1D"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-4 font-display text-lg font-bold text-text">
          Workspace ready
        </p>
        <p className="mt-1 text-sm text-muted">Opening your workspace.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2" aria-hidden="true">
        {[1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-pill transition-[width] duration-200 ease-brand",
              step === index ? "w-14 bg-blue" : "w-6 bg-line"
            )}
          />
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">Step {step} of 2</p>

      <div
        key={step}
        className={cn(
          direction === "forward" ? "animate-step-forward" : "animate-step-back"
        )}
      >
        {step === 1 ? (
          <form onSubmit={goToStepTwo} noValidate>
            <h1 className="mt-2 font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-text">
              Your company
            </h1>
            <p className="mt-1.5 text-[15px] text-muted">
              This runs once and creates the company settings.
            </p>

            <div className="mt-7">
              <Input
                label="Company name"
                autoComplete="organization"
                leadingIcon={Building2}
                placeholder="S.M.I.T"
                value={values.companyName}
                onChange={update("companyName")}
                error={fieldErrors.companyName}
                autoFocus
              />
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full">
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h1 className="mt-2 font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-text">
              Admin account
            </h1>
            <p className="mt-1.5 text-[15px] text-muted">
              You will sign in with this account.
            </p>

            <div className="mt-7 space-y-4">
              <Input
                label="Full name"
                autoComplete="name"
                leadingIcon={UserRound}
                value={values.adminName}
                onChange={update("adminName")}
                error={fieldErrors.adminName}
                autoFocus
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                leadingIcon={Mail}
                value={values.adminEmail}
                onChange={update("adminEmail")}
                error={fieldErrors.adminEmail}
              />
              <div className="space-y-2.5">
                <PasswordInput
                  label="Password"
                  autoComplete="new-password"
                  leadingIcon={Lock}
                  value={values.adminPassword}
                  onChange={update("adminPassword")}
                  error={fieldErrors.adminPassword}
                />
                <PasswordStrength value={values.adminPassword} />
              </div>
              <PasswordInput
                label="Confirm password"
                autoComplete="new-password"
                leadingIcon={Lock}
                value={values.confirm}
                onChange={update("confirm")}
                error={fieldErrors.confirm}
              />
            </div>

            <FormError bordered className="mt-4">
              {formError}
            </FormError>

            <div className="mt-6 flex items-center gap-3">
              <Button variant="secondary" size="lg" onClick={goBack}>
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                loading={submitting}
              >
                Create workspace
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
