import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import CheckInPanel from "@/components/attendance/CheckInPanel";
import { PayslipPdfButton } from "@/components/payroll/PayslipDrawer";
import { useAssistantPanel } from "@/components/ai/AssistantProvider";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable from "@/components/data/DataTable";
import PageSection from "@/components/ui/PageSection";
import StatCard from "@/components/ui/StatCard";
import LeaveBalanceCards from "@/components/leave/LeaveBalanceCards";
import { useCompanyTimeZone } from "@/context/CompanyTimeContext";
import { useResource } from "@/hooks/useResource";
import { formatDateTimeIn, formatMoney } from "@/lib/format";
import { monthLabel } from "@/lib/time";

function HoursProgress({ hours, target }) {
  const goal = Number(target) || 40;
  const done = Number(hours) || 0;
  const percent = Math.min(100, Math.round((done / goal) * 100));

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">Hours this week</p>
        <p className="text-xs text-muted-foreground">Target {goal}h</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {done.toFixed(2)}h
      </p>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={done}
        aria-label="Hours worked this week against the weekly target"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{percent}% of the weekly target</p>
    </Card>
  );
}

function LastPayslipCard({ payslip }) {
  if (!payslip) {
    return (
      <Card className="p-5">
        <p className="text-xs font-medium text-muted-foreground">Last payslip</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No finalized payslip yet. It appears after payroll for the month is finalized.
        </p>
        <Link
          to="/me/payslips"
          className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Open my payslips
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-muted-foreground">Last payslip</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {formatMoney(payslip.netPay)}
      </p>
      <p className="text-xs text-muted-foreground">
        Net pay for {monthLabel(payslip.month)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PayslipPdfButton payslipId={payslip.id} month={payslip.month} />
        <Link
          to="/me/payslips"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          All payslips
        </Link>
      </div>
    </Card>
  );
}

export default function MyDay({ data, loading, error, onRetry }) {
  const timeZone = useCompanyTimeZone();
  const { openAssistant } = useAssistantPanel();
  const announcements = data?.announcements || [];

  const announcementColumns = [
    {
      key: "title",
      header: "Announcement",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.body}</p>
        </div>
      ),
    },
    {
      key: "author",
      header: "From",
      className: "whitespace-nowrap",
      render: (row) => row.authorName || "-",
    },
    {
      key: "when",
      header: "When",
      className: "whitespace-nowrap text-muted-foreground",
      render: (row) => formatDateTimeIn(row.createdAt, timeZone),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckInPanel onChecked={onRetry} />
        </div>
        <HoursProgress hours={data?.hoursThisWeek} target={data?.weeklyHours} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Late this month"
          value={loading ? "-" : data?.lateCount ?? 0}
          hint="Late check-ins, after the grace period"
        />
        <LastPayslipCard payslip={data?.lastPayslip} />
        <Card className="flex flex-col justify-between p-5">
          <div>
            <p className="text-sm font-medium">Ask my assistant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your own leave, attendance and payslip, in plain words.
            </p>
          </div>
          <Button className="mt-4 self-start" onClick={openAssistant}>
            <Bot className="h-4 w-4" aria-hidden="true" />
            Ask my assistant
          </Button>
        </Card>
      </div>

      <PageSection
        title="Leave balance"
        actions={
          <Link
            to="/me/leave"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Apply for leave
          </Link>
        }
      >
        {data?.leaveBalances?.length ? (
          <LeaveBalanceCards balances={data.leaveBalances} />
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            {loading ? "Loading your balances" : "No leave types are set up yet."}
          </Card>
        )}
      </PageSection>

      <PageSection
        title="Latest announcements"
        actions={
          <Link
            to="/announcements"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            All announcements
          </Link>
        }
      >
        <DataTable
          columns={announcementColumns}
          rows={announcements}
          loading={loading}
          error={error}
          onRetry={onRetry}
          errorTitle="Announcements did not load"
          empty={{
            title: "No announcements yet",
            description: "Company news appears here once HR or the Admin posts it.",
          }}
        />
      </PageSection>
    </div>
  );
}
