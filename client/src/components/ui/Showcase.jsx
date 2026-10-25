import { useState } from "react";
import { Clock, Plus, Sparkles, Trash2, Users, Wallet } from "lucide-react";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import MessageBubble from "@/components/ai/MessageBubble";
import TypingIndicator from "@/components/ai/TypingIndicator";
import { BarChartBox, LineChartBox, PieChartBox } from "@/components/charts/ChartBoxes";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import StatStrip from "@/components/dashboard/StatStrip";
import Avatar from "./Avatar";
import Button from "./Button";
import Card from "./Card";
import Checkbox from "./Checkbox";
import DateInput from "./DateInput";
import Divider from "./Divider";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import Input from "./Input";
import Kbd from "./Kbd";
import Modal from "./Modal";
import MonthInput from "./MonthInput";
import PageHeader from "./PageHeader";
import Pagination from "./Pagination";
import PasswordInput from "./PasswordInput";
import Progress from "./Progress";
import Radio from "./Radio";
import SegmentedControl from "./SegmentedControl";
import Select from "./Select";
import Skeleton, { SkeletonRows, SkeletonText } from "./Skeleton";
import StatusBadge, { StatusPill } from "./StatusBadge";
import Switch from "./Switch";
import Tabs from "./Tabs";
import Textarea from "./Textarea";
import Tooltip from "./Tooltip";

const STATUSES = [
  "present",
  "late",
  "half_day",
  "absent",
  "on_leave",
  "off",
  "missing_checkout",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "draft",
  "finalized",
  "probation",
  "active",
  "exited",
  "inactive",
];

function Section({ title, children }) {
  return (
    <Card className="p-6">
      <h2 className="font-display text-[17px] font-bold text-text">{title}</h2>
      <div className="mt-4 flex flex-wrap items-start gap-3">{children}</div>
    </Card>
  );
}

export default function Showcase() {
  const [tab, setTab] = useState("one");
  const [segment, setSegment] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState("2026-10-26");
  const [month, setMonth] = useState("2026-10");
  const [choice, setChoice] = useState("hr");

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Component showcase"
        description="Every component in every state, at development only."
      />

      <Section title="Buttons">
        {["primary", "secondary", "ghost", "danger", "success"].map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        {["sm", "md", "lg"].map((size) => (
          <Button key={size} size={size}>
            size {size}
          </Button>
        ))}
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button size="icon" aria-label="Add">
          <Plus className="h-4 w-4" />
        </Button>
      </Section>

      <Section title="Fields">
        <div className="w-64 space-y-4">
          <Input label="Text" placeholder="Placeholder" />
          <Input label="With error" error="Enter a valid email" defaultValue="nope" />
          <PasswordInput label="Password" />
          <Textarea label="Notes" rows={3} />
          <Select label="Role" defaultValue="hr">
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="employee">Employee</option>
          </Select>
          <DateInput label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
          <MonthInput label="Month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Checkbox label="Send me email" defaultChecked />
          <Radio
            label="HR user"
            name="showcase-role"
            value="hr"
            checked={choice === "hr"}
            onChange={() => setChoice("hr")}
          />
          <Switch label="Active" defaultChecked />
        </div>
      </Section>

      <Section title="Status">
        {STATUSES.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
        <StatusPill status="pending" live />
        <StatusBadge status="approved" size="sm" />
      </Section>

      <Section title="Avatars">
        {["sm", "md", "lg", "xl"].map((size) => (
          <Avatar key={size} user={{ name: "Ayesha Khan" }} size={size} />
        ))}
        <Avatar user={{ name: "Bilal Ahmed" }} />
        <Avatar user={{ name: "Sana Iqbal" }} ring />
      </Section>

      <Section title="Tabs and segments">
        <div className="w-full">
          <Tabs
            tabs={[
              { id: "one", label: "Overview" },
              { id: "two", label: "Attendance" },
              { id: "three", label: "Leave" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-4">
            <SegmentedControl
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
              ]}
              value={segment}
              onChange={setSegment}
            />
          </div>
        </div>
      </Section>

      <Section title="Meters and misc">
        <div className="w-64 space-y-4">
          <Progress label="Attendance" hint="92%" value={92} />
          <Progress label="Leave used" hint="3 of 20" value={3} max={20} />
        </div>
        <Divider label="or" className="w-64" />
        <Tooltip label="Tooltips show on hover and focus">
          <Button variant="secondary">Hover me</Button>
        </Tooltip>
        <span className="text-sm text-muted">
          Press <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
        </span>
      </Section>

      <section className="space-y-4">
        <h2 className="font-display text-[17px] font-bold text-text">
          Dashboard pieces
        </h2>
        <DashboardGreeting
          name="Ayesha Khan"
          context="3 leave and 1 attendance approvals are waiting for you."
          actions={[
            { label: "Review approvals", to: "/dev/ui" },
            { label: "Register employee", to: "/dev/ui" },
          ]}
        />
        <StatStrip
          segments={[
            { label: "Headcount", icon: Users, tone: "blue", value: 42 },
            { label: "Present today", icon: Users, tone: "lime", value: 37 },
            { label: "Late today", icon: Clock, tone: "amber", value: 3, hint: "3" },
            { label: "Payroll", icon: Wallet, tone: "violet", value: 0, text: "PKR 1,240,000" },
          ]}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartBox
          title="Headcount by department"
          data={[
            { department: "Engineering", count: 18 },
            { department: "Sales", count: 11 },
            { department: "Support", count: 7 },
          ]}
          xKey="department"
          series={[{ key: "count", label: "People" }]}
          summary="Headcount by department."
        />
        <LineChartBox
          title="Attendance trend"
          data={[
            { date: "2026-10-20", percent: 92 },
            { date: "2026-10-21", percent: 95 },
            { date: "2026-10-22", percent: 88 },
          ]}
          xKey="date"
          series={[{ key: "percent", label: "Attendance" }]}
          valueFormatter={(value) => `${Math.round(value)}%`}
          summary="Attendance trend."
        />
        <PieChartBox
          title="Gender split"
          data={[
            { name: "Male", value: 24 },
            { name: "Female", value: 16 },
            { name: "Other", value: 2 },
          ]}
          summary="Gender split."
        />
      </div>

      <Section title="Assistant messages">
        <div className="w-full max-w-md space-y-3 rounded-xl bg-mist p-3">
          <MessageBubble
            message={{
              id: "m1",
              role: "assistant",
              content: "You have **42 active employees**, 37 present today.",
              toolsUsed: ["attendance_summary"],
            }}
          />
          <MessageBubble
            message={{
              id: "m2",
              role: "user",
              content: "Who is on leave today?",
            }}
            newest
          />
          <div className="flex items-center gap-2 rounded-[18px] rounded-tl-[6px] bg-surface px-3.5 py-2.5 shadow-e1">
            <TypingIndicator />
          </div>
        </div>
      </Section>

      <section className="space-y-4">
        <h2 className="font-display text-[17px] font-bold text-text">
          Attendance calendar
        </h2>
        <AttendanceCalendar
          month="2026-10"
          days={[
            { date: "2026-10-01", status: "present", record: { workedMinutes: 480 } },
            { date: "2026-10-02", status: "late", record: { workedMinutes: 455 } },
            { date: "2026-10-03", status: "off", record: null },
            { date: "2026-10-04", status: "on_leave", record: null },
            { date: "2026-10-05", status: "absent", record: null },
            { date: "2026-10-06", status: "half_day", record: { workedMinutes: 240 } },
            { date: "2026-10-07", status: "missing_checkout", record: { workedMinutes: 300 } },
            { date: "2026-10-08", status: "present", record: { workedMinutes: 485 } },
          ]}
        />
      </section>

      <Section title="Loading and empty">
        <div className="w-full space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={3} />
          <SkeletonRows rows={3} />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <EmptyState
            title="No employees yet"
            description="Register your first employee to see them here."
            action={<Button>Register employee</Button>}
          />
        </Card>
        <ErrorState
          title="Could not load payroll"
          message="Check your connection and try again."
          onRetry={() => {}}
        />
      </div>

      <Card className="p-4">
        <Pagination
          page={2}
          pages={5}
          total={42}
          onChange={() => {}}
          pageSize={10}
          onPageSizeChange={() => {}}
        />
      </Card>

      <Section title="Dialog">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open dialog
        </Button>
        <Button variant="danger" onClick={() => setModalOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
        <Button variant="success" onClick={() => setModalOpen(true)}>
          <Sparkles className="h-4 w-4" /> Approve
        </Button>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm this action"
        description="A short explanation of what happens next."
        intent="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setModalOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-2">
          The panel enters with a scale and a small rise, and the backdrop blurs
          the page behind it.
        </p>
      </Modal>
    </div>
  );
}
