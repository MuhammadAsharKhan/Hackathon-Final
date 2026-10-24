import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";

const Detail = ({ label, value }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 break-words text-sm">{value || "-"}</dd>
  </div>
);

const GENDER_LABELS = { male: "Male", female: "Female", other: "Other" };

export default function EmployeeProfileTab({ employee }) {
  return (
    <Card className="p-6">
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Employee code" value={employee.code} />
        <Detail label="Email" value={employee.email} />
        <Detail label="Phone" value={employee.phone} />
        <Detail label="Department" value={employee.department} />
        <Detail label="Designation" value={employee.designation} />
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <StatusBadge kind="employee" status={employee.status} />
          </dd>
        </div>
        <Detail label="Join date" value={formatDate(employee.joinDate)} />
        <Detail label="Exit date" value={employee.exitDate ? formatDate(employee.exitDate) : "-"} />
        <Detail label="Date of birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "-"} />
        <Detail label="Gender" value={GENDER_LABELS[employee.gender] || "-"} />
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs text-muted-foreground">Address</dt>
          <dd className="mt-0.5 whitespace-pre-line break-words text-sm">
            {employee.address || "-"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
