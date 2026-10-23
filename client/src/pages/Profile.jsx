import { useState } from "react";
import toast from "react-hot-toast";
import AvatarUpload from "@/components/profile/AvatarUpload";
import EmailVerificationFlow from "@/components/auth/EmailVerificationFlow";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Tabs, { tabId, tabPanelId } from "@/components/ui/Tabs";
import { changePassword, updateProfile } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { setToken } from "@/lib/tokenStore";
import {
  GENDER_OPTIONS,
  PASSWORD_HINT,
  validateAge,
  validateName,
  validatePassword,
} from "@/lib/validation";

const TABS = [
  { id: "account", label: "Account" },
  { id: "passwords", label: "Passwords" },
];

const EMPTY_PASSWORDS = {
  currentPassword: "",
  newPassword: "",
  confirm: "",
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  useDocumentTitle("Profile");

  const [tab, setTab] = useState("account");

  const [account, setAccount] = useState({
    name: user?.name || "",
    age: user?.age ?? "",
    gender: user?.gender ?? "",
  });
  const [accountErrors, setAccountErrors] = useState({});
  const [accountError, setAccountError] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);

  const updateAccount = (field) => (event) => {
    const { value } = event.target;
    setAccount((previous) => ({ ...previous, [field]: value }));
    setAccountErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const updatePassword = (field) => (event) => {
    const { value } = event.target;
    setPasswords((previous) => ({ ...previous, [field]: value }));
    setPasswordErrors((previous) => ({ ...previous, [field]: undefined }));
    setPasswordError("");
  };

  const resetPasswordForm = () => {
    setPasswords(EMPTY_PASSWORDS);
    setPasswordErrors({});
    setPasswordError("");
    setVerified(false);
    setResetToken("");
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    const nameError = validateName(account.name);
    if (nameError) nextErrors.name = nameError;

    const ageError = validateAge(account.age);
    if (ageError) nextErrors.age = ageError;

    setAccountErrors(nextErrors);
    setAccountError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingAccount(true);

    try {
      const payload = {
        name: account.name.trim(),
        age: Number(account.age),
      };
      if (account.gender) payload.gender = account.gender;

      const data = await updateProfile(payload);
      updateUser(data.user);
      toast.success("Profile updated");
    } catch (requestError) {
      setAccountErrors(getFieldErrors(requestError));
      setAccountError(getErrorMessage(requestError));
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (user?.hasPassword && !verified && !passwords.currentPassword) {
      nextErrors.currentPassword = "Enter your current password";
    }

    const newPasswordError = validatePassword(passwords.newPassword);
    if (newPasswordError) nextErrors.newPassword = newPasswordError;

    if (
      user?.hasPassword &&
      !verified &&
      passwords.newPassword &&
      passwords.newPassword === passwords.currentPassword
    ) {
      nextErrors.newPassword =
        "New password must be different from the current password";
    }

    if (passwords.newPassword !== passwords.confirm) {
      nextErrors.confirm = "Passwords do not match";
    }

    setPasswordErrors(nextErrors);
    setPasswordError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingPassword(true);

    try {
      const payload = verified
        ? { resetToken, newPassword: passwords.newPassword }
        : {
            currentPassword: passwords.currentPassword,
            newPassword: passwords.newPassword,
          };

      const data = await changePassword(payload);
      setToken(data.accessToken);
      updateUser(data.user);
      resetPasswordForm();
      toast.success("Password updated. Other sessions were signed out.");
    } catch (requestError) {
      setPasswordErrors(getFieldErrors(requestError));
      setPasswordError(getErrorMessage(requestError));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleVerified = (token) => {
    setResetToken(token);
    setVerified(true);
    setVerifyOpen(false);
    setPasswordErrors({});
    setPasswordError("");
  };

  const showCurrentPassword = user?.hasPassword && !verified;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details, photo and password."
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        idPrefix="profile"
        label="Profile sections"
      />

      {tab === "account" ? (
        <div
          role="tabpanel"
          id={tabPanelId("profile", "account")}
          aria-labelledby={tabId("profile", "account")}
          className="pt-2"
        >
          <Card className="p-6">
            <AvatarUpload />

            <form
              className="mt-6 space-y-4"
              onSubmit={handleAccountSubmit}
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Name"
                  autoComplete="name"
                  value={account.name}
                  onChange={updateAccount("name")}
                  error={accountErrors.name}
                />
                <Input
                  label="Age"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={150}
                  step={1}
                  value={account.age}
                  onChange={updateAccount("age")}
                  error={accountErrors.age}
                />
                <Select
                  label="Gender"
                  value={account.gender}
                  onChange={updateAccount("gender")}
                  error={accountErrors.gender}
                >
                  <option value="">Not set</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Email"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="bg-surface text-muted-foreground"
                />
              </div>

              <div className="flex items-end gap-2">
                <Input
                  label="User ID"
                  value={user?.uid || ""}
                  readOnly
                  className="bg-surface font-mono tabular-nums text-muted-foreground"
                />
                <CopyButton
                  value={user?.uid || ""}
                  label="Copy user id"
                  className="mb-1 h-8 w-8"
                />
              </div>

              <FormError>{accountError}</FormError>

              <Button type="submit" loading={savingAccount}>
                Save changes
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <div
          role="tabpanel"
          id={tabPanelId("profile", "passwords")}
          aria-labelledby={tabId("profile", "passwords")}
          className="pt-2"
        >
          <Card className="max-w-xl p-6">
            <form
              className="space-y-4"
              onSubmit={handlePasswordSubmit}
              noValidate
            >
              {user?.hasPassword ? null : (
                <p className="text-sm text-muted-foreground">
                  This account has no password yet. Verify your email to set
                  one.
                </p>
              )}

              {showCurrentPassword ? (
                <>
                  <Input
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    value={passwords.currentPassword}
                    onChange={updatePassword("currentPassword")}
                    error={passwordErrors.currentPassword}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => setVerifyOpen(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                </>
              ) : verified ? (
                <Input
                  label="Current password"
                  value="Verified via email"
                  disabled
                  readOnly
                  className="bg-surface text-muted-foreground"
                />
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setVerifyOpen(true)}
                >
                  Verify via email
                </Button>
              )}

              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={updatePassword("newPassword")}
                error={passwordErrors.newPassword}
                hint={PASSWORD_HINT}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={updatePassword("confirm")}
                error={passwordErrors.confirm}
              />

              <FormError>{passwordError}</FormError>

              <Button type="submit" loading={savingPassword}>
                Save password
              </Button>
            </form>
          </Card>

          <Modal
            open={verifyOpen}
            onClose={() => setVerifyOpen(false)}
            title="Verify your email"
            description="We will email a six digit code to confirm it is you."
          >
            <EmailVerificationFlow
              initialEmail={user?.email || ""}
              lockEmail
              onVerified={handleVerified}
            />
          </Modal>
        </div>
      )}
    </div>
  );
}
