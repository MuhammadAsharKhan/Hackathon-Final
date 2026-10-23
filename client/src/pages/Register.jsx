import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import GoogleSection from "@/components/auth/GoogleSection";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import {
  EMAIL_PATTERN,
  GENDER_CHOICES,
  PASSWORD_HINT,
  validateAge,
  validateName,
  validatePassword,
} from "@/lib/validation";

const EMPTY_FORM = {
  name: "",
  email: "",
  age: "",
  gender: "",
  password: "",
};

export default function Register() {
  const { register } = useAuth();
  useDocumentTitle("Create account");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";
  const [values, setValues] = useState(EMPTY_FORM);
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

    const nameError = validateName(name);
    if (nameError) nextErrors.name = nameError;

    if (!EMAIL_PATTERN.test(email)) nextErrors.email = "Enter a valid email";

    const ageError = validateAge(values.age);
    if (ageError) nextErrors.age = ageError;

    const passwordError = validatePassword(values.password);
    if (passwordError) nextErrors.password = passwordError;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const payload = {
        name,
        email,
        password: values.password,
        age: Number(values.age),
      };
      if (values.gender) payload.gender = values.gender;

      await register(payload);
      toast.success("Account created");
      navigate(from, { replace: true });
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
          label="Age"
          type="number"
          inputMode="numeric"
          min={1}
          max={150}
          step={1}
          required
          value={values.age}
          onChange={update("age")}
          error={fieldErrors.age}
        />
        <Select
          label="Gender"
          value={values.gender}
          onChange={update("gender")}
          error={fieldErrors.gender}
        >
          <option value="">Prefer not to say (optional)</option>
          {GENDER_CHOICES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update("password")}
          error={fieldErrors.password}
          hint={PASSWORD_HINT}
        />

        <FormError bordered>{formError}</FormError>

        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <GoogleSection />

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
