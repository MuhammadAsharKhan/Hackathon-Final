import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import { changePassword, updateProfile } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { setToken } from "@/lib/tokenStore";

const EMPTY_PASSWORDS = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [nameErrors, setNameErrors] = useState({});
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const updateName = (event) => {
    setName(event.target.value);
    setNameErrors({});
    setNameError("");
  };

  const updatePassword = (field) => (event) => {
    const { value } = event.target;
    setPasswords((previous) => ({ ...previous, [field]: value }));
    setPasswordErrors((previous) => ({ ...previous, [field]: undefined }));
    setPasswordError("");
  };

  const handleNameSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 60) {
      setNameErrors({ name: "Name must be between 2 and 60 characters" });
      return;
    }

    setNameErrors({});
    setNameError("");
    setSavingName(true);

    try {
      const data = await updateProfile({ name: trimmed });
      updateUser(data.user);
      toast.success("Profile updated");
    } catch (requestError) {
      setNameErrors(getFieldErrors(requestError));
      setNameError(getErrorMessage(requestError));
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!passwords.currentPassword)
      nextErrors.currentPassword = "Enter your current password";

    if (passwords.newPassword.length < 8)
      nextErrors.newPassword = "Password must be at least 8 characters";
    else if (passwords.newPassword.length > 72)
      nextErrors.newPassword = "Password must be at most 72 characters";
    else if (
      !/[A-Za-z]/.test(passwords.newPassword) ||
      !/[0-9]/.test(passwords.newPassword)
    )
      nextErrors.newPassword = "Use at least one letter and one number";

    if (passwords.newPassword !== passwords.confirmPassword)
      nextErrors.confirmPassword = "Passwords do not match";

    setPasswordErrors(nextErrors);
    setPasswordError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingPassword(true);

    try {
      const data = await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setToken(data.accessToken);
      updateUser(data.user);
      setPasswords(EMPTY_PASSWORDS);
      toast.success("Password updated. Other sessions were signed out.");
    } catch (requestError) {
      setPasswordErrors(getFieldErrors(requestError));
      setPasswordError(getErrorMessage(requestError));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Your account details and password."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-medium">Name</h2>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

          <form
            className="mt-5 space-y-4"
            onSubmit={handleNameSubmit}
            noValidate
          >
            <Input
              label="Display name"
              value={name}
              onChange={updateName}
              error={nameErrors.name}
              autoComplete="name"
            />

            {nameError ? (
              <p role="alert" className="text-sm text-danger">
                {nameError}
              </p>
            ) : null}

            <Button type="submit" loading={savingName}>
              Save name
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-medium">Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Changing it signs out your other devices.
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={handlePasswordSubmit}
            noValidate
          >
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={updatePassword("currentPassword")}
              error={passwordErrors.currentPassword}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={updatePassword("newPassword")}
              error={passwordErrors.newPassword}
              hint="8 to 72 characters, with a letter and a number."
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={updatePassword("confirmPassword")}
              error={passwordErrors.confirmPassword}
            />

            {passwordError ? (
              <p role="alert" className="text-sm text-danger">
                {passwordError}
              </p>
            ) : null}

            <Button type="submit" loading={savingPassword}>
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
