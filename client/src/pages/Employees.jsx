import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Plus, Upload, Users } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import FilterBar from "@/components/data/FilterBar";
import EmployeeFormModal from "@/components/employees/EmployeeFormModal";
import ImportCsvModal from "@/components/employees/ImportCsvModal";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import TemporaryPasswordModal from "@/components/users/TemporaryPasswordModal";
import { exportEmployees, listEmployees } from "@/api/employees.api";
import { listDepartments, listDesignations } from "@/api/organization.api";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/format";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "probation", label: "Probation" },
  { value: "active", label: "Active" },
  { value: "exited", label: "Exited" },
];

export default function Employees() {
  useDocumentTitle("Employees");

  const { user } = useAuth();
  const navigate = useNavigate();
  const isHr = user?.role === "hr";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useResource(
    () =>
      listEmployees({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
        status: status || undefined,
      }),
    [page, search, departmentId, designationId, status]
  );

  const { data: org } = useResource(
    () => Promise.all([listDepartments(), listDesignations()]),
    []
  );

  const departments = org?.[0]?.departments || [];
  const designations = org?.[1]?.designations || [];
  const employees = data?.employees || [];
  const pagination = data?.pagination;

  const clearFilters = () => {
    setSearch("");
    setDepartmentId("");
    setDesignationId("");
    setStatus("");
    setPage(1);
  };

  const handleCreated = (result) => {
    setFormOpen(false);
    setCreated({
      accountName: `${result.employee.name} (${result.employee.code})`,
      password: result.temporaryPassword,
    });
    setPage(1);
    reload();
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const download = await exportEmployees();
      saveBlob(download.blob, download.filename);
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Employee",
      render: (employee) => (
        <div className="min-w-0">
          <Link
            to={`/employees/${employee.id}`}
            className="font-medium hover:underline"
          >
            {employee.name}
          </Link>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {employee.code}
          </p>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (employee) => employee.department || "-",
    },
    {
      key: "designation",
      header: "Designation",
      className: "text-muted-foreground",
      render: (employee) => employee.designation || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (employee) => <StatusBadge kind="employee" status={employee.status} />,
    },
    {
      key: "joinDate",
      header: "Joined",
      className: "whitespace-nowrap text-muted-foreground",
      render: (employee) => formatDate(employee.joinDate),
    },
    {
      key: "basicSalary",
      header: "Basic salary",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (employee) => formatMoney(employee.basicSalary),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={
          isHr
            ? "Every person record, its salary and its sign-in account."
            : "Every person record in the company."
        }
        actions={
          isHr ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={handleExport} loading={exporting}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </Button>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import CSV
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Register employee
              </Button>
            </div>
          ) : null
        }
      />

      <FilterBar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Search by name, code or email",
          label: "Search employees",
        }}
        filters={[
          {
            key: "department",
            label: "Department",
            allLabel: "All departments",
            value: departmentId,
            onChange: (value) => {
              setDepartmentId(value);
              setPage(1);
            },
            options: departments.map((department) => ({
              value: department.id,
              label: department.name,
            })),
          },
          {
            key: "designation",
            label: "Designation",
            allLabel: "All designations",
            value: designationId,
            onChange: (value) => {
              setDesignationId(value);
              setPage(1);
            },
            options: designations.map((designation) => ({
              value: designation.id,
              label: designation.name,
            })),
          },
          {
            key: "status",
            label: "Status",
            allLabel: "All statuses",
            value: status,
            onChange: (value) => {
              setStatus(value);
              setPage(1);
            },
            options: STATUS_FILTERS,
          },
        ]}
        onClear={clearFilters}
      />

      <DataTable
        columns={columns}
        rows={employees}
        loading={loading}
        error={error}
        errorTitle="Employees did not load"
        onRetry={reload}
        onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
        empty={{
          icon: Users,
          title:
            search || departmentId || designationId || status
              ? "No employee matches these filters"
              : "No employees yet",
          description:
            search || departmentId || designationId || status
              ? "Try a different search or clear the filters."
              : isHr
                ? "Register the first employee to start the records."
                : "Employees appear here once HR adds them.",
        }}
        pagination={
          pagination
            ? {
                page: pagination.page,
                pages: pagination.pages,
                total: pagination.total,
                onChange: setPage,
                itemLabel: "employees",
                itemLabelSingular: "employee",
                disabled: loading,
              }
            : undefined
        }
      />

      {formOpen ? (
        <EmployeeFormModal
          open={formOpen}
          mode="create"
          onClose={() => setFormOpen(false)}
          onSaved={handleCreated}
        />
      ) : null}

      {importOpen ? (
        <ImportCsvModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={reload}
        />
      ) : null}

      <TemporaryPasswordModal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Employee account created"
        accountName={created?.accountName}
        password={created?.password}
      />
    </div>
  );
}
