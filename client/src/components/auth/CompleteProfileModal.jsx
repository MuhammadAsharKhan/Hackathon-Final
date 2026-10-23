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
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { GENDER_CHOICES, validateAge } from "@/lib/validation";

const EMPTY_FORM = { age: "", gender: "" };

export default function CompleteProfileModal() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const open = Boolean(user && user.age === null);
  const [profileForm, setProfileForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const mountedRef = useMountedRef();

  useEffect(() => {
    if (!open) return;

    setProfileForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setSaving(false);
  }, [open]);

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setProfileForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSignOut = async () => {
    await logout();
    if (!mountedRef.current) return;
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const ageError = validateAge(profileForm.age);
    const nextErrors = {};
    if (ageError) nextErrors.age = ageError;

    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const profileUpdates = { age: Number(profileForm.age) };
      if (profileForm.gender) profileUpdates.gender = profileForm.gender;

      const profileData = await updateProfile(profileUpdates);
      if (!mountedRef.current) return;

      updateUser(profileData.user);
      toast.success("Profile complete");
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
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
          value={profileForm.age}
          onChange={updateField("age")}
          error={fieldErrors.age}
        />
        <Select
          label="Gender"
          value={profileForm.gender}
          onChange={updateField("gender")}
          error={fieldErrors.gender}
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
