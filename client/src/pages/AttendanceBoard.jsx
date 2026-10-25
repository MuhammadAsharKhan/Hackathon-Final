import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import CorrectionDecisionModal from "@/components/attendance/CorrectionDecisionModal";
import DataTable from "@/components/data/DataTable";
import FilterBar from "@/components/data/FilterBar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DateInput from "@/components/ui/DateInput";
import PageHeader from "@/components/ui/PageHeader";
import PageSection from "@/components/ui/PageSection";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import { getBoard, listCorrections } from "@/api/attendance.api";
import { listDepartments } from "@/api/organization.api";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHrEmployeeIds } from "@/hooks/useHrEmployeeIds";
import { useResource } from "@/hooks/useResource";
import { formatDate } from "@/lib/format";
import { deviceToday, formatClock, formatHours } from "@/lib/time";

const BOARD_LIMIT = 100;
const CORRECTION_PAGE_SIZE = 10;
const TABS_PREFIX = "attendance-board";

const TABS = [
  { id: "board", label: "Board" },
  { id: "corrections", label: "Corrections" },
];

const STATUS_FILTERS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half day" },
  { value: "absent", label: "Absent" },
  { value: "missing_checkout", label: "Missing check-out" },
  { value: "on_leave", label: "On leave" },
  { value: "off", label: "Off" },
];

const countBy = (rows) =>
  rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});

const requestedTimes = (correction) =>
  [
    correction.requestedCheckIn ? `in ${correction.requestedCheckIn}` : null,
    correction.requestedCheckOut ? `out ${correction.requestedCheckOut}` : null,
  ]
    .filter(Boolean)
    .join(", ") || "-";

export default function AttendanceBoard() {
  useDocumentTitle("Attendance");

  const { user, employee } = useAuth();
  const timeZone = useCompanyTimeZone();
  const { employeeIds: hrEmployeeIds, loading: hrLoading } = useHrEmployeeIds();

  const [tab, setTab] = useState("board");
  const [date, setDate] = useState(deviceToday());
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [correctionPage, setCorrectionPage] = useState(1);
  const [modal, setModal] = useState(null);

  const { data: org } = useResource(() => listDepartments(), []);
  const departments = org?.departments || [];

  const board = useResource(
    () =>
      tab === "board"
        ? getBoard({
            date,
            departmentId: departmentId || undefined,
            search: search || undefined,
            status: status || undefined,
            limit: BOARD_LIMIT,
          })
        : Promise.resolve(null),
    [tab, date, departmentId, search, status]
  );

  // The summary strip counts the whole day, not the filtered table.
  const allDay = useResource(
    () =>
      tab === "board"
        ? getBoard({
            date,
            departmentId: departmentId || undefined,
            limit: BOARD_LIMIT,
          })
        : Promise.resolve(null),
    [tab, date, departmentId]
  );

  const corrections = useResource(
    () => listCorrections({ status: "pending", page: correctionPage, limit: CORRECTION_PAGE_SIZE }),
    [correctionPage]
  );

  const counts = countBy(allDay.data?.rows || []);

  const canDecide = (correction) => {
    if (user?.role === "hr") return correction.employeeId !== employee?.id;
    if (user?.role === "admin") return hrEmployeeIds.has(correction.employeeId);
    return false;
  };

  const denyReason = (correction) => {
    if (user?.role === "hr") return "Your own correction requests are decided by the Admin.";
    if (user?.role === "admin" && !hrEmployeeIds.has(correction.employeeId)) {
      return "An admin decides correction requests from HR employees only.";
    }
    return "";
  };

  const boardColumns = [
    {
      key: "name",
      header: "Employee",
      render: (row) => (
        <div className="min-w-0">
          <Link
            to={`/employees/${row.employeeId}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {row.code}
          </p>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      className: "text-muted-foreground",
      render: (row) => row.department || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge kind="attendance" status={row.status} />,
    },
    {
      key: "checkIn",
      header: "Check in",
      className: "whitespace-nowrap tabular-nums",
      render: (row) => formatClock(row.checkIn, timeZone),
    },
    {
      key: "checkOut",
      header: "Check out",
      className: "whitespace-nowrap tabular-nums",
      render: (row) => formatClock(row.checkOut, timeZone),
    },
    {
      key: "source",
      header: "Source",
      className: "whitespace-nowrap",
      render: (row) =>
        row.source ? (
          <StatusBadge kind="source" status={row.source} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "hours",
      header: "Hours",
      className: "whitespace-nowrap tabular-nums",
      render: (row) => formatHours(row.workedMinutes),
    },
  ];

  const correctionColumns = [
    {
      key: "employee",
      header: "Employee",
      render: (correction) => (
        <div className="min-w-0">
          <p className="font-medium">{correction.employeeName || "-"}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {correction.employeeCode}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      render: (correction) => formatDate(correction.date),
    },
    {
      key: "requested",
      header: "Requested",
      className: "whitespace-nowrap tabular-nums",
      render: requestedTimes,
    },
    {
      key: "reason",
      header: "Reason",
      className: "text-muted-foreground",
      render: (correction) => correction.reason,
    },
    {
      key: "actions",
      header: "Decision",
      render: (correction) =>
        hrLoading ? null : canDecide(correction) ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModal({ correction, decision: "approve" })}
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => setModal({ correction, decision: "reject" })}
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="max-w-[14rem] text-xs text-muted-foreground">
            {denyReason(correction)}
          </p>
        ),
    },
  ];

  const summaryCards = [
    { label: "Present", value: counts.present || 0 },
    { label: "Late", value: counts.late || 0 },
    { label: "Half day", value: counts.half_day || 0 },
    { label: "Absent", value: counts.absent || 0 },
    { label: "On leave", value: counts.on_leave || 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="The daily board and the correction requests waiting for a decision."
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        idPrefix={TABS_PREFIX}
        label="Attendance sections"
      />

      {tab === "board" ? (
        <div className="space-y-5">
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search by name, code or email",
              label: "Search employees",
            }}
            filters={[
              {
                key: "department",
                label: "Department",
                allLabel: "All departments",
                value: departmentId,
                onChange: setDepartmentId,
                options: departments.map((department) => ({
                  value: department.id,
                  label: department.name,
                })),
              },
              {
                key: "status",
                label: "Status",
                allLabel: "All statuses",
                value: status,
                onChange: setStatus,
                options: STATUS_FILTERS,
              },
            ]}
            onClear={() => {
              setSearch("");
              setDepartmentId("");
              setStatus("");
            }}
            actions={
              <div className="w-full sm:w-44">
                <DateInput
                  label="Date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {summaryCards.map((card) => (
              <Card key={card.label} className="bg-surface-tint p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {card.value}
                </p>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {allDay.loading
              ? "Loading the day"
              : `${formatDate(allDay.data?.date || date)} across ${
                  allDay.data?.rows?.length ?? 0
                } active employees.`}
          </p>

          <DataTable
            columns={boardColumns}
            rows={board.data?.rows || []}
            getRowId={(row) => row.employeeId}
            loading={board.loading}
            error={board.error}
            errorTitle="The board did not load"
            onRetry={board.reload}
            empty={{
              title: "Nobody matches these filters",
              description: "Try another date, department or status.",
            }}
          />
        </div>
      ) : (
        <PageSection
          title="Pending correction requests"
          description="Approving rewrites the day with the requested times."
        >
          <DataTable
            columns={correctionColumns}
            rows={corrections.data?.corrections || []}
            loading={corrections.loading}
            error={corrections.error}
            errorTitle="Correction requests did not load"
            onRetry={corrections.reload}
            empty={{
              title: "No pending correction requests",
              description: "Requests from employees appear here until a decision.",
            }}
            pagination={
              corrections.data?.pagination
                ? {
                    page: corrections.data.pagination.page,
                    pages: corrections.data.pagination.pages,
                    total: corrections.data.pagination.total,
                    onChange: setCorrectionPage,
                    itemLabel: "requests",
                    itemLabelSingular: "request",
                    disabled: corrections.loading,
                  }
                : undefined
            }
          />
        </PageSection>
      )}

      {modal ? (
        <CorrectionDecisionModal
          key={`${modal.correction.id}-${modal.decision}`}
          open
          correction={modal.correction}
          decision={modal.decision}
          onClose={() => setModal(null)}
          onDecided={() => {
            setModal(null);
            toast.success(
              modal.decision === "approve" ? "Correction approved" : "Correction rejected"
            );
            corrections.reload();
            board.reload();
            allDay.reload();
          }}
        />
      ) : null}
    </div>
  );
}
