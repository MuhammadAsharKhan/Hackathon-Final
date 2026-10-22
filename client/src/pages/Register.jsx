import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();
    const nextErrors = {};

    if (name.length < 2) nextErrors.name = "Name must be at least 2 characters";
    else if (name.length > 60)
      nextErrors.name = "Name must be at most 60 characters";

    if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Enter a valid email";

    if (values.password.length < 8)
      nextErrors.password = "Password must be at least 8 characters";
    else if (values.password.length > 72)
      nextErrors.password = "Password must be at most 72 characters";
    else if (!/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password))
      nextErrors.password = "Use at least one letter and one number";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      await register({ name, email, password: values.password });
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        One account is enough to use every page.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Name"
          autoComplete="name"
          value={values.name}
          onChange={update("name")}
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={update("email")}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update("password")}
          error={fieldErrors.password}
          hint="8 to 72 characters, with a letter and a number."
        />

        {formError ? (
          <p
            role="alert"
            className="rounded-lg border border-danger px-3 py-2 text-sm text-danger"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
