import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AccountPanel from "@/components/profile/AccountPanel";
import PasswordPanel from "@/components/profile/PasswordPanel";
import PageHeader from "@/components/ui/PageHeader";
import Tabs, { tabId, tabPanelId } from "@/components/ui/Tabs";
import { changePassword, updateProfile } from "@/api/users.api";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { setToken } from "@/lib/tokenStore";
import {
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

const validateAccountInput = ({ name, age }) => {
  const errors = {};

  const nameError = validateName(name);
  if (nameError) errors.name = nameError;

  const ageError = validateAge(age);
  if (ageError) errors.age = ageError;

  return errors;
};

const validatePasswordInput = (passwords, user, verified) => {
  const errors = {};

  if (user?.hasPassword && !verified && !passwords.currentPassword) {
    errors.currentPassword = "Enter your current password";
  }

  const newPasswordError = validatePassword(passwords.newPassword);
  if (newPasswordError) errors.newPassword = newPasswordError;

  if (
    user?.hasPassword &&
    !verified &&
    passwords.newPassword &&
    passwords.newPassword === passwords.currentPassword
  ) {
    errors.newPassword =
      "New password must be different from the current password";
  }

  if (passwords.newPassword !== passwords.confirm) {
    errors.confirm = "Passwords do not match";
  }

  return errors;
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  useDocumentTitle("Profile");

  const [tab, setTab] = useState("account");
  const mountedRef = useMountedRef();

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

  useEffect(() => {
    if (!user) return;
    setAccount((previous) => ({
      ...previous,
      age: user.age ?? "",
      gender: user.gender ?? "",
    }));
  }, [user?.age, user?.gender]);

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
    if (savingAccount) return;

    const nextErrors = validateAccountInput(account);
    setAccountErrors(nextErrors);
    setAccountError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingAccount(true);

    try {
      const profileUpdates = {
        name: account.name.trim(),
        age: Number(account.age),
      };
      if (account.gender) profileUpdates.gender = account.gender;

      const profileData = await updateProfile(profileUpdates);
      if (!mountedRef.current) return;

      updateUser(profileData.user);
      setAccount({
        name: profileData.user.name || "",
        age: profileData.user.age ?? "",
        gender: profileData.user.gender ?? "",
      });
      setAccountErrors({});
      setAccountError("");
      toast.success("Profile updated");
    } catch (requestError) {
      if (!mountedRef.current) return;
      setAccountErrors(getFieldErrors(requestError));
      setAccountError(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setSavingAccount(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (savingPassword) return;

    const nextErrors = validatePasswordInput(passwords, user, verified);
    setPasswordErrors(nextErrors);
    setPasswordError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingPassword(true);

    try {
      const passwordInput = verified
        ? { resetToken, newPassword: passwords.newPassword }
        : {
            currentPassword: passwords.currentPassword,
            newPassword: passwords.newPassword,
          };

      const passwordData = await changePassword(passwordInput);
      if (!mountedRef.current) return;

      setToken(passwordData.accessToken);
      updateUser(passwordData.user);
      resetPasswordForm();
      toast.success("Password updated. Other sessions were signed out.");
    } catch (requestError) {
      if (!mountedRef.current) return;
      setPasswordErrors(getFieldErrors(requestError));
      setPasswordError(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setSavingPassword(false);
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
          <AccountPanel
            user={user}
            account={account}
            errors={accountErrors}
            formError={accountError}
            saving={savingAccount}
            onChange={updateAccount}
            onSubmit={handleAccountSubmit}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id={tabPanelId("profile", "passwords")}
          aria-labelledby={tabId("profile", "passwords")}
          className="pt-2"
        >
          <PasswordPanel
            user={user}
            passwords={passwords}
            errors={passwordErrors}
            formError={passwordError}
            saving={savingPassword}
            verified={verified}
            showCurrentPassword={showCurrentPassword}
            verifyOpen={verifyOpen}
            onChange={updatePassword}
            onSubmit={handlePasswordSubmit}
            onOpenVerification={() => setVerifyOpen(true)}
            onCloseVerification={() => setVerifyOpen(false)}
            onVerified={handleVerified}
          />
        </div>
      )}
    </div>
  );
}
