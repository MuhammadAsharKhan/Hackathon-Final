import { useCallback, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";
import { checkIn, checkOut, getToday } from "@/api/attendance.api";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useResource } from "@/hooks/useResource";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { formatClock, formatHours } from "@/lib/time";

const minutesSince = (instant) => {
  if (!instant) return 0;
  const started = new Date(instant).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.round((Date.now() - started) / 60000));
};

export default function CheckInPanel({ onChecked }) {
  const timeZone = useCompanyTimeZone();
  const [busy, setBusy] = useState("");

  const { data, loading, error, reload } = useResource(() => getToday(), []);
  const record = data?.record || null;
  const open = Boolean(record?.checkIn && !record?.checkOut);

  const run = useCallback(
    async (action, message) => {
      if (busy) return;
      setBusy(action);

      try {
        await (action === "in" ? checkIn({}) : checkOut({}));
        toast.success(message);
        reload();
        onChecked?.();
      } catch (failure) {
        toast.error(getErrorMessage(failure));
        reload();
      } finally {
        setBusy("");
      }
    },
    [busy, onChecked, reload]
  );

  if (error) {
    return (
      <ErrorState
        title="Today's attendance did not load"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {data?.date ? formatDate(data.date) : "Today"}
          </p>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="skeleton h-5 w-24" />
            ) : (
              <StatusBadge kind="attendance" status={data?.status} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm sm:text-right">
          <div>
            <p className="text-xs text-muted-foreground">Checked in</p>
            <p className="mt-0.5 tabular-nums">
              {loading ? "-" : formatClock(record?.checkIn, timeZone)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Checked out</p>
            <p className="mt-0.5 tabular-nums">
              {loading ? "-" : formatClock(record?.checkOut, timeZone)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hours so far</p>
            <p className="mt-0.5 tabular-nums">
              {loading
                ? "-"
                : formatHours(
                    open ? minutesSince(record?.checkIn) : record?.workedMinutes
                  )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          onClick={() => run("in", "Checked in")}
          disabled={loading || !data?.canCheckIn}
          loading={busy === "in"}
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Check in
        </Button>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => run("out", "Checked out")}
          disabled={loading || !data?.canCheckOut}
          loading={busy === "out"}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Check out
        </Button>
      </div>

      {!loading && data?.status === "on_leave" && !record ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Approved leave covers today, so check-in is not available.
        </p>
      ) : null}
      {!loading && record?.checkIn && record?.checkOut ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Today is closed. Ask for a correction if a time is wrong.
        </p>
      ) : null}
    </Card>
  );
}
