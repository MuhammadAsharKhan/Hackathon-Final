import { useState } from "react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import FilterBar from "@/components/data/FilterBar";
import LeaveDecisionModal from "@/components/leave/LeaveDecisionModal";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import { listLeaveRequests } from "@/api/leave.api";
import { listEmployees } from "@/api/employees.api";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHrEmployeeIds } from "@/hooks/useHrEmployeeIds";
import { useResource } from "@/hooks/useResource";
import { formatDateRange } from "@/lib/format";

const PAGE_SIZE = 10;
const TABS_PREFIX = "leave-requests";

const TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export default function LeaveRequests() {
  useDocumentTitle("Leave requests");

  const { user, employee } = useAuth();
  const { employeeIds: hrEmployeeIds, loading: hrLoading } = useHrEmployeeIds();

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modal, setModal] = useState(null);

  const { data, loading, error, reload } = useResource(
    () =>
      listLeaveRequests({
        status: tab === "all" ? undefined : tab,
        employeeId: employeeId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [tab, employeeId, from, to, page]
  );

  const { data: people } = useResource(() => listEmployees({ limit: 100 }), []);
  const employeeOptions = (people?.employees || []).map((row) => ({
    value: row.id,
    label: `${row.name} (${row.code})`,
  }));

  const canDecide = (request) => {
    if (user?.role === "hr") return request.employeeId !== employee?.id;
    if (user?.role === "admin") return hrEmployeeIds.has(request.employeeId);
    return false;
  };

  const denyReason = (request) => {
    if (user?.role === "hr") return "Your own requests are decided by the Admin.";
    if (user?.role === "admin" && !hrEmployeeIds.has(request.employeeId)) {
      return "An admin decides requests from HR employees only.";
    }
    return "";
  };

  const columns = [
    {
      key: "employee",
      header: "Employee",
      render: (request) => (
        <div className="min-w-0">
          <p className="font-medium">{request.employeeName || "-"}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {request.employeeCode}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      className: "whitespace-nowrap",
      render: (request) => request.leaveTypeName || request.leaveTypeCode,
    },
    {
      key: "dates",
      header: "Dates",
      className: "whitespace-nowrap",
      render: (request) => formatDateRange(request.startDate, request.endDate),
    },
    {
      key: "days",
      header: "Days",
      className: "tabular-nums",
      render: (request) => request.days,
    },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-[16rem] text-muted-foreground",
      render: (request) => (
        <span className="line-clamp-2" title={request.reason}>
          {request.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (request) => <StatusBadge kind="leave" status={request.status} />,
    },
    {
      key: "actions",
      header: "Decision",
      render: (request) =>
        request.status !== "pending" ? (
          <p className="max-w-[14rem] text-xs text-muted-foreground">
            {request.decisionComment || "No comment"}
          </p>
        ) : hrLoading ? null : canDecide(request) ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModal({ request, decision: "approve" })}
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => setModal({ request, decision: "reject" })}
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="max-w-[14rem] text-xs text-muted-foreground">
            {denyReason(request)}
          </p>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave requests"
        description="Every request, with the decision and the comment that came with it."
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setPage(1);
        }}
        idPrefix={TABS_PREFIX}
        label="Leave request status"
      />

      <FilterBar
        filters={[
          {
            key: "employee",
            label: "Employee",
            allLabel: "All employees",
            value: employeeId,
            onChange: (value) => {
              setEmployeeId(value);
              setPage(1);
            },
            options: employeeOptions,
          },
        ]}
        dateRange={{
          from,
          to,
          onFromChange: (value) => {
            setFrom(value);
            setPage(1);
          },
          onToChange: (value) => {
            setTo(value);
            setPage(1);
          },
        }}
        onClear={() => {
          setEmployeeId("");
          setFrom("");
          setTo("");
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        rows={data?.requests || []}
        loading={loading}
        error={error}
        errorTitle="Leave requests did not load"
        onRetry={reload}
        empty={{
          title:
            employeeId || from || to
              ? "No request matches these filters"
              : `No ${tab === "all" ? "" : `${tab} `}leave requests`,
          description:
            employeeId || from || to
              ? "Try a different employee or date range."
              : "Requests appear here as soon as employees send them.",
        }}
        pagination={
          data?.pagination
            ? {
                page: data.pagination.page,
                pages: data.pagination.pages,
                total: data.pagination.total,
                onChange: setPage,
                itemLabel: "requests",
                itemLabelSingular: "request",
                disabled: loading,
              }
            : undefined
        }
      />

      {modal ? (
        <LeaveDecisionModal
          key={`${modal.request.id}-${modal.decision}`}
          open
          request={modal.request}
          decision={modal.decision}
          onClose={() => setModal(null)}
          onDecided={() => {
            setModal(null);
            toast.success(
              modal.decision === "approve" ? "Leave approved" : "Leave rejected"
            );
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
