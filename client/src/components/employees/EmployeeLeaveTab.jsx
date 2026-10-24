import DataTable from "@/components/data/DataTable";
import LeaveBalanceCards from "@/components/leave/LeaveBalanceCards";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateRange } from "@/lib/format";

const LEAVE_TYPE_LABELS = {
  annual: "Annual",
  sick: "Sick",
  casual: "Casual",
  unpaid: "Unpaid",
};

const typeLabel = (request) =>
  request.leaveTypeName ||
  LEAVE_TYPE_LABELS[request.leaveTypeCode] ||
  request.leaveTypeCode;

export default function EmployeeLeaveTab({ balances = [], recentLeaves = [] }) {
  const columns = [
    {
      key: "type",
      header: "Type",
      render: (request) => typeLabel(request),
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
      key: "status",
      header: "Status",
      render: (request) => <StatusBadge kind="leave" status={request.status} />,
    },
    {
      key: "comment",
      header: "Decision comment",
      className: "text-muted-foreground",
      render: (request) => request.decisionComment || "-",
    },
  ];

  return (
    <div className="space-y-5">
      <LeaveBalanceCards balances={balances} />

      <DataTable
        columns={columns}
        rows={recentLeaves}
        getRowId={(request) => request.id || request._id}
        empty={{
          title: "No leave requests yet",
          description: "Requests this employee submits appear here.",
        }}
      />
    </div>
  );
}
