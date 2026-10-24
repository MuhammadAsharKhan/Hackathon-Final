import { useState } from "react";
import toast from "react-hot-toast";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import AttendanceSummary from "@/components/attendance/AttendanceSummary";
import CheckInPanel from "@/components/attendance/CheckInPanel";
import CorrectionRequestModal from "@/components/attendance/CorrectionRequestModal";
import DataTable from "@/components/data/DataTable";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import MonthInput from "@/components/ui/MonthInput";
import PageHeader from "@/components/ui/PageHeader";
import PageSection from "@/components/ui/PageSection";
import StatusBadge from "@/components/ui/StatusBadge";
import { getMyMonth, listCorrections } from "@/api/attendance.api";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResource } from "@/hooks/useResource";
import { formatDate } from "@/lib/format";
import { deviceMonth, monthLabel } from "@/lib/time";

const CORRECTION_PAGE_SIZE = 5;

const timesOf = (correction) =>
  [
    correction.requestedCheckIn ? `in ${correction.requestedCheckIn}` : null,
    correction.requestedCheckOut ? `out ${correction.requestedCheckOut}` : null,
  ]
    .filter(Boolean)
    .join(", ") || "-";

export default function MyAttendance() {
  useDocumentTitle("My attendance");

  const timeZone = useCompanyTimeZone();
  const [month, setMonth] = useState(deviceMonth());
  const [refreshKey, setRefreshKey] = useState(0);
  const [correctionPage, setCorrectionPage] = useState(1);
  const [selectedDay, setSelectedDay] = useState(null);

  const refresh = () => setRefreshKey((current) => current + 1);

  const { data, loading, error, reload } = useResource(
    () => getMyMonth(month),
    [month, refreshKey]
  );

  const corrections = useResource(
    () => listCorrections({ page: correctionPage, limit: CORRECTION_PAGE_SIZE }),
    [correctionPage, refreshKey]
  );

  const columns = [
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
      render: timesOf,
    },
    {
      key: "reason",
      header: "Reason",
      className: "text-muted-foreground",
      render: (correction) => correction.reason,
    },
    {
      key: "status",
      header: "Status",
      render: (correction) => (
        <StatusBadge kind="correction" status={correction.status} />
      ),
    },
    {
      key: "decision",
      header: "Decision comment",
      className: "text-muted-foreground",
      render: (correction) => correction.decisionComment || "-",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My attendance"
        description="Check in, check out and review the month."
        actions={
          <div className="w-full sm:w-48">
            <MonthInput
              label="Month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
        }
      />

      <CheckInPanel onChecked={refresh} />

      {error ? (
        <ErrorState
          title="This month did not load"
          message={error}
          onRetry={reload}
        />
      ) : (
        <>
          <AttendanceSummary summary={data?.summary} />

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                {monthLabel(data?.month || month)}
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose a past day to request a correction.
              </p>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="grid grid-cols-7 gap-1" aria-busy="true">
                  {Array.from({ length: 35 }).map((_, index) => (
                    <div key={index} className="skeleton h-12 sm:h-14" />
                  ))}
                  <span className="sr-only" role="status">
                    Loading the calendar
                  </span>
                </div>
              ) : (
                <AttendanceCalendar
                  month={data?.month || month}
                  days={data?.days || []}
                  timeZone={timeZone}
                  onDayClick={setSelectedDay}
                />
              )}
            </div>
          </Card>
        </>
      )}

      <PageSection
        title="My correction requests"
        description="HR decides these. An approved correction rewrites the day."
      >
        <DataTable
          columns={columns}
          rows={corrections.data?.corrections || []}
          loading={corrections.loading}
          error={corrections.error}
          errorTitle="Correction requests did not load"
          onRetry={corrections.reload}
          empty={{
            title: "No correction requests",
            description: "Pick a day in the calendar to send the first one.",
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

      {selectedDay ? (
        <CorrectionRequestModal
          key={selectedDay.date}
          open
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onRequested={() => {
            setSelectedDay(null);
            toast.success("Correction requested");
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
