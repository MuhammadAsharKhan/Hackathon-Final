import StatCard from "@/components/ui/StatCard";
import { formatHours, percentLabel } from "@/lib/time";

export default function AttendanceSummary({ summary, className }) {
  const cards = [
    { label: "Present", value: summary?.present ?? 0 },
    { label: "Late", value: summary?.late ?? 0 },
    { label: "Half days", value: summary?.halfDay ?? 0 },
    { label: "Absent", value: summary?.absent ?? 0 },
    { label: "On leave", value: summary?.onLeave ?? 0 },
    { label: "Attendance rate", value: percentLabel(summary?.attendanceRate) },
    { label: "Hours worked", value: formatHours(summary?.workedMinutes) },
  ];

  return (
    <div
      className={
        className ||
        "grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      }
    >
      {cards.map((card) => (
        <StatCard key={card.label} label={card.label} value={card.value} />
      ))}
    </div>
  );
}
