import DataTable from "@/components/data/DataTable";
import MonthInput from "@/components/ui/MonthInput";
import StatusBadge from "@/components/ui/StatusBadge";
import AttendanceSummary from "@/components/attendance/AttendanceSummary";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { formatDate } from "@/lib/format";
import { formatClock, formatHours, weekdayLabel } from "@/lib/time";

export default function EmployeeAttendanceTab({ attendance, month, onMonthChange }) {
  const timeZone = useCompanyTimeZone();
  const days = attendance?.days || [];

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      render: (day) => (
        <div>
          <p className="tabular-nums">{formatDate(day.date)}</p>
          <p className="text-xs text-muted-foreground">{weekdayLabel(day.date)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (day) => <StatusBadge kind="attendance" status={day.status} />,
    },
    {
      key: "checkIn",
      header: "Check in",
      className: "whitespace-nowrap tabular-nums",
      render: (day) => formatClock(day.record?.checkIn, timeZone),
    },
    {
      key: "checkOut",
      header: "Check out",
      className: "whitespace-nowrap tabular-nums",
      render: (day) => formatClock(day.record?.checkOut, timeZone),
    },
    {
      key: "source",
      header: "Source",
      className: "whitespace-nowrap",
      render: (day) =>
        day.record?.source ? (
          <StatusBadge kind="source" status={day.record.source} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "hours",
      header: "Hours",
      className: "whitespace-nowrap tabular-nums",
      render: (day) => (day.record ? formatHours(day.record.workedMinutes) : "-"),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="w-full sm:w-52">
        <MonthInput
          label="Month"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
        />
      </div>

      <AttendanceSummary summary={attendance?.summary} />

      <DataTable
        columns={columns}
        rows={days}
        getRowId={(day) => day.date}
        empty={{
          title: "No days in this month",
          description: "Pick another month to see the attendance.",
        }}
      />
    </div>
  );
}
