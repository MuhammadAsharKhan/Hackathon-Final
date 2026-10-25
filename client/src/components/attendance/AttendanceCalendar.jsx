import { cn } from "@/lib/cn";
import {
  deviceToday,
  dayOfMonth,
  formatClock,
  formatHours,
  leadingBlanks,
} from "@/lib/time";
import StatusPill, { statusLabel } from "@/components/ui/StatusBadge";
import Progress from "@/components/ui/Progress";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// One bar colour per status, matching the StatusPill map.
const BAR = {
  present: "bg-lime-700",
  late: "bg-status-amber",
  half_day: "bg-status-violet",
  absent: "bg-status-rose",
  on_leave: "bg-blue-700",
  missing_checkout: "bg-status-slate",
  off: "bg-status-slate",
  not_employed: "bg-status-slate",
  future: "bg-line",
};

const LEGEND = ["present", "late", "half_day", "absent", "on_leave", "off"];

const isCorrectable = (day) =>
  ["present", "late", "half_day", "absent", "missing_checkout"].includes(
    day.status
  ) && day.date <= deviceToday();

const describe = (day, timeZone) => {
  const parts = [statusLabel("attendance", day.status)];
  if (day.record?.checkIn) parts.push(`in ${formatClock(day.record.checkIn, timeZone)}`);
  if (day.record?.checkOut) parts.push(`out ${formatClock(day.record.checkOut, timeZone)}`);
  if (day.record?.workedMinutes) parts.push(formatHours(day.record.workedMinutes));
  if (day.record?.source === "camera") parts.push("Camera check-in");
  return parts.join(", ");
};

export default function AttendanceCalendar({
  month,
  days = [],
  timeZone,
  onDayClick,
}) {
  const blanks = leadingBlanks(month);
  const today = deviceToday();

  const counts = days.reduce(
    (totals, day) => {
      if (day.status === "present" || day.status === "late") totals.present += 1;
      if (day.status === "late") totals.late += 1;
      if (day.status === "half_day") totals.halfDay += 1;
      if (day.status === "absent") totals.absent += 1;
      if (day.status === "on_leave") totals.onLeave += 1;
      if (["present", "late", "half_day", "absent"].includes(day.status)) {
        totals.expected += 1;
      }
      return totals;
    },
    { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0, expected: 0 }
  );

  const attendanceRate =
    counts.expected > 0 ? Math.round((counts.present / counts.expected) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* summary strip, same segmented style as the stat strip */}
      <div className="grid grid-cols-2 overflow-hidden rounded-card bg-surface shadow-e2 sm:grid-cols-5">
        {[
          { label: "Present", value: counts.present },
          { label: "Late", value: counts.late },
          { label: "Half days", value: counts.halfDay },
          { label: "Absent", value: counts.absent },
          { label: "On leave", value: counts.onLeave },
        ].map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "px-4 py-3",
              index % 2 === 1 && "border-l border-line-soft",
              index > 0 && "sm:border-l sm:border-line-soft"
            )}
          >
            <p className="font-display text-[20px] font-extrabold tabular-nums leading-none text-text">
              {item.value}
            </p>
            <p className="mt-1 text-[12.5px] text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-card bg-surface p-4 shadow-e2">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAY_HEADERS.map((weekday) => (
            <div
              key={weekday}
              className="py-1 text-center text-[11.5px] font-semibold text-muted"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }).map((_, index) => (
            <div key={`blank-${index}`} aria-hidden="true" />
          ))}

          {days.map((day) => {
            const label = describe(day, timeZone);
            const correctable = onDayClick ? isCorrectable(day) : false;
            const isToday = day.date === today;
            const isOff = day.status === "off" || day.status === "not_employed";
            const isEmpty = day.status === "future" || day.status === "not_employed";

            const content = (
              <>
                <span
                  className={cn(
                    "text-[12.5px] font-semibold tabular-nums",
                    isOff ? "text-muted" : "text-text"
                  )}
                >
                  {isEmpty ? "" : dayOfMonth(day.date)}
                </span>
                {day.record?.workedMinutes ? (
                  <span className="text-[10px] leading-tight text-muted">
                    {formatHours(day.record.workedMinutes)}
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-1.5 bottom-1.5 h-1 rounded-pill",
                    BAR[day.status] || "bg-status-slate",
                    isEmpty && "opacity-0"
                  )}
                />
              </>
            );

            const classes = cn(
              "relative flex h-14 flex-col items-start justify-start rounded-[14px] px-1.5 pt-1.5 text-left",
              "transition-[background-color] duration-150",
              isOff
                ? "bg-[repeating-linear-gradient(135deg,#F3F6FB,#F3F6FB_4px,#E9EEF7_4px,#E9EEF7_8px)]"
                : "bg-mist",
              isToday && "ring-2 ring-blue",
              correctable ? "hover:bg-blue-50" : "",
              isEmpty && "bg-transparent"
            );

            return correctable ? (
              <button
                key={day.date}
                type="button"
                className={classes}
                title={`${day.date} - ${label}`}
                aria-label={`${day.date}, ${label}. Request a correction.`}
                onClick={() => onDayClick(day)}
              >
                {content}
              </button>
            ) : (
              <div key={day.date} className={classes} title={`${day.date} - ${label}`}>
                {content}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          {LEGEND.map((status) => (
            <StatusPill key={status} kind="attendance" status={status} size="sm" />
          ))}
        </div>

        <div className="mt-3">
          <Progress
            label="Attendance rate"
            hint={`${attendanceRate}%`}
            value={attendanceRate}
          />
        </div>
      </div>
    </div>
  );
}

