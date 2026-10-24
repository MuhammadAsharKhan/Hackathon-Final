import { useState } from "react";
import toast from "react-hot-toast";
import DataTable from "@/components/data/DataTable";
import LeaveBalanceCards from "@/components/leave/LeaveBalanceCards";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";
import SmartLeaveBox from "@/components/leave/SmartLeaveBox";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import PageSection from "@/components/ui/PageSection";
import StatusBadge from "@/components/ui/StatusBadge";
import { cancelLeave, getLeaveBalance, listLeaveRequests } from "@/api/leave.api";
import { listLeaveTypes } from "@/api/organization.api";
import { useConfirm } from "@/hooks/useConfirm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { formatDate, formatDateRange } from "@/lib/format";
import { deviceToday } from "@/lib/time";

const PAGE_SIZE = 10;

const canCancel = (request) =>
  request.status === "pending" ||
  (request.status === "approved" && request.startDate > deviceToday());

export default function MyLeave() {
  useDocumentTitle("My leave");

  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [suggestion, setSuggestion] = useState(null);
  const { ask, dialogProps } = useConfirm();

  const refresh = () => setRefreshKey((current) => current + 1);

  const balance = useResource(() => getLeaveBalance(), [refreshKey]);
  const types = useResource(() => listLeaveTypes(), []);
  const history = useResource(
    () => listLeaveRequests({ page, limit: PAGE_SIZE }),
    [page, refreshKey]
  );

  const balances = balance.data?.balances || [];
  const leaveTypes = types.data?.leaveTypes || [];
  const typeName = (code) =>
    balances.find((item) => item.code === code)?.name ||
    leaveTypes.find((item) => item.code === code)?.name ||
    code;

  const columns = [
    {
      key: "type",
      header: "Type",
      render: (request) => request.leaveTypeName || typeName(request.leaveTypeCode),
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
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (request) =>
        canCancel(request) ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() =>
              ask({
                title: "Cancel leave request",
                description: `${typeName(request.leaveTypeCode)} from ${formatDate(
                  request.startDate
                )} to ${formatDate(request.endDate)} will be cancelled.`,
                confirmLabel: "Cancel request",
                run: async () => {
                  await cancelLeave(request.id);
                  toast.success("Leave request cancelled");
                  refresh();
                },
              })
            }
          >
            Cancel
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My leave"
        description="Your balances and requests for this year."
      />

      {balance.error ? (
        <ErrorState
          title="Leave balances did not load"
          message={balance.error}
          onRetry={balance.reload}
        />
      ) : (
        <LeaveBalanceCards balances={balances} />
      )}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <SmartLeaveBox onSuggestion={setSuggestion} typeName={typeName} />

        <LeaveRequestForm
          leaveTypes={leaveTypes}
          suggestion={suggestion}
          onApplied={() => {
            setSuggestion(null);
            toast.success("Leave request submitted");
            setPage(1);
            refresh();
          }}
        />
      </div>

      <PageSection
        title="My requests"
        description="Newest first. An approved request that starts later can be cancelled."
      >
        <DataTable
          columns={columns}
          rows={history.data?.requests || []}
          loading={history.loading}
          error={history.error}
          errorTitle="Your leave requests did not load"
          onRetry={history.reload}
          empty={{
            title: "No leave requests yet",
            description: "Use the form above to send the first one.",
          }}
          pagination={
            history.data?.pagination
              ? {
                  page: history.data.pagination.page,
                  pages: history.data.pagination.pages,
                  total: history.data.pagination.total,
                  onChange: setPage,
                  itemLabel: "requests",
                  itemLabelSingular: "request",
                  disabled: history.loading,
                }
              : undefined
          }
        />
      </PageSection>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
