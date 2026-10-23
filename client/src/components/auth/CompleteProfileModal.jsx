import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { updateProfile } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { GENDER_CHOICES, validateAge } from "@/lib/validation";

const EMPTY_FORM = { age: "", gender: "" };

export default function CompleteProfileModal() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const open = Boolean(user && user.age === null);
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setValues(EMPTY_FORM);
    setErrors({});
    setFormError("");
    setSaving(false);
  }, [open]);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ageError = validateAge(values.age);
    const nextErrors = {};

    if (ageError) nextErrors.age = ageError;

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const payload = { age: Number(values.age) };
      if (values.gender) payload.gender = values.gender;

      const data = await updateProfile(payload);
      updateUser(data.user);
      toast.success("Profile complete");
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setFormError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      title="Finish your profile"
      description="Add your age to continue. Gender is optional."
      footer={
        <>
          <Button variant="ghost" onClick={handleSignOut} disabled={saving}>
            Sign out
          </Button>
          <Button type="submit" form="complete-profile-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="complete-profile-form"
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
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
          error={errors.age}
        />
        <Select
          label="Gender"
          value={values.gender}
          onChange={update("gender")}
          error={errors.gender}
        >
          <option value="">Prefer not to say (optional)</option>
          {GENDER_CHOICES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <FormError bordered>{formError}</FormError>
      </form>
    </Modal>
  );
}
