import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import EmployeeAttendanceTab from "@/components/employees/EmployeeAttendanceTab";
import EmployeeFormModal from "@/components/employees/EmployeeFormModal";
import EmployeeLeaveTab from "@/components/employees/EmployeeLeaveTab";
import EmployeePayrollTab from "@/components/employees/EmployeePayrollTab";
import EmployeeProfileTab from "@/components/employees/EmployeeProfileTab";
import SalaryModal from "@/components/employees/SalaryModal";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import PageLoading from "@/components/ui/PageLoading";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs, { tabId, tabPanelId } from "@/components/ui/Tabs";
import { getEmployeeOverview } from "@/api/employees.api";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { deviceMonth } from "@/lib/time";

const TAB_IDS = {
  profile: "profile",
  attendance: "attendance",
  leave: "leave",
  payroll: "payroll",
};

const TABS = [
  { id: TAB_IDS.profile, label: "Profile" },
  { id: TAB_IDS.attendance, label: "Attendance" },
  { id: TAB_IDS.leave, label: "Leave" },
  { id: TAB_IDS.payroll, label: "Payroll" },
];

const TABS_PREFIX = "employee-360";

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [tab, setTab] = useState(TAB_IDS.profile);
  const [month, setMonth] = useState(deviceMonth());
  const [editOpen, setEditOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);

  const { data, loading, error, reload } = useResource(
    () => getEmployeeOverview(id, month),
    [id, month]
  );

  const profile = data?.profile;
  const isHr = user?.role === "hr";
  const canViewSalary = user?.role === "admin" || isHr;

  useDocumentTitle(profile?.name || "Employee");

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {canViewSalary ? (
          <Button as={Link} to="/employees" variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Employees
          </Button>
        ) : null}
        <ErrorState
          title="This employee record did not load"
          message={error}
          onRetry={canViewSalary ? reload : undefined}
        />
      </div>
    );
  }

  const meta = [profile.code, profile.department, profile.designation]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {canViewSalary ? (
        <Button as={Link} to="/employees" variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Employees
        </Button>
      ) : null}

      <PageHeader
        title={profile.name}
        description={meta}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="employee" status={profile.status} />
            {isHr ? (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit employee
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        idPrefix={TABS_PREFIX}
        label="Employee sections"
      />

      <div
        role="tabpanel"
        id={tabPanelId(TABS_PREFIX, tab)}
        aria-labelledby={tabId(TABS_PREFIX, tab)}
        tabIndex={0}
      >
        {tab === TAB_IDS.profile ? (
          <EmployeeProfileTab employee={profile} />
        ) : null}

        {tab === TAB_IDS.attendance ? (
          <EmployeeAttendanceTab
            attendance={data.attendance}
            month={month}
            onMonthChange={setMonth}
          />
        ) : null}

        {tab === TAB_IDS.leave ? (
          <EmployeeLeaveTab
            balances={data.leaveBalances}
            recentLeaves={data.recentLeaves}
          />
        ) : null}

        {tab === TAB_IDS.payroll ? (
          <EmployeePayrollTab
            employee={profile}
            payslips={data.payslips}
            canViewSalary={canViewSalary}
            canEditSalary={isHr}
            onEditSalary={() => setSalaryOpen(true)}
          />
        ) : null}
      </div>

      {editOpen ? (
        <EmployeeFormModal
          open={editOpen}
          mode="edit"
          employee={profile}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            toast.success("Employee updated");
            reload();
          }}
        />
      ) : null}

      {salaryOpen ? (
        <SalaryModal
          open={salaryOpen}
          employee={profile}
          onClose={() => setSalaryOpen(false)}
          onSaved={() => {
            setSalaryOpen(false);
            toast.success("Salary updated");
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
