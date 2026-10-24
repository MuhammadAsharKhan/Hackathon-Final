import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import Textarea from "@/components/ui/Textarea";
import { getEmployeeProfile, updateMyProfile } from "@/api/profile.api";
import { ROLE_LABELS } from "@/config/menus";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import { CHANGE_PASSWORD_PATH } from "@/lib/navigation";

const EMPTY_CONTACT = { phone: "", address: "" };

const validate = (form) => {
  const errors = {};

  if (form.phone.length > 30) errors.phone = "Phone is too long";
  if (form.address.length > 300) errors.address = "Address is too long";

  return errors;
};

export default function MyProfile() {
  useDocumentTitle("My profile");

  const { user, employee, applyEmployee } = useAuth();
  const { data, loading, error } = useResource(
    () =>
      employee?.id
        ? getEmployeeProfile(employee.id)
        : Promise.resolve({ employee: null }),
    [employee?.id]
  );
  const mountedRef = useMountedRef();

  const [form, setForm] = useState(EMPTY_CONTACT);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const record = data?.employee || null;

  useEffect(() => {
    if (!record) return;
    setForm({ phone: record.phone || "", address: record.address || "" });
  }, [record]);

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const result = await updateMyProfile({
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      if (!mountedRef.current) return;

      if (result.employee) {
        applyEmployee({
          id: result.employee.id,
          code: result.employee.code,
          name: result.employee.name,
          department: employee?.department ?? null,
          designation: employee?.designation ?? null,
          status: result.employee.status,
        });
        setForm({
          phone: result.employee.phone || "",
          address: result.employee.address || "",
        });
      }
      toast.success("Profile updated");
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="My profile"
        description="Your employee record and the contact details you can change."
        actions={
          <Button as={Link} to={CHANGE_PASSWORD_PATH} variant="secondary">
            Change password
          </Button>
        }
      />

      <Card className="p-6">
        <h2 className="text-base font-semibold tracking-tight">Employee record</h2>

        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-8 w-full" />
            ))}
          </div>
        ) : (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-0.5 font-medium">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 break-all">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-0.5">{ROLE_LABELS[user?.role] || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Employee code</dt>
              <dd className="mt-0.5 tabular-nums">{employee?.code || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Department</dt>
              <dd className="mt-0.5">{employee?.department || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Designation</dt>
              <dd className="mt-0.5">{employee?.designation || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge kind="employee" status={employee?.status} />
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold tracking-tight">Contact details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phone and address are the only fields you can edit here.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
            Saved contact details did not load. You can still update them below.
          </p>
        ) : null}

        <form className="mt-4 max-w-xl space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Phone"
            value={form.phone}
            onChange={update("phone")}
            error={fieldErrors.phone}
            hint="Up to 30 characters."
          />
          <Textarea
            label="Address"
            rows={3}
            value={form.address}
            onChange={update("address")}
            error={fieldErrors.address}
          />

          <FormError>{formError}</FormError>

          <Button type="submit" loading={saving} disabled={loading}>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
