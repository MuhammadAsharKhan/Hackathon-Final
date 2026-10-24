import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const tail = (value) => (value === null || value === undefined ? "-" : value);

function BalanceCard({ balance }) {
  const unlimited = balance.quota === null;

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">{balance.name}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {unlimited ? "Unlimited" : tail(balance.remaining)}
      </p>
      <p className="text-xs text-muted-foreground">
        {unlimited ? "No yearly limit" : "days left"}
      </p>
      <dl className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>Quota</dt>
          <dd className="tabular-nums">{unlimited ? "-" : balance.quota}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Approved</dt>
          <dd className="tabular-nums">{balance.used}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Pending</dt>
          <dd className="tabular-nums">{balance.pending}</dd>
        </div>
      </dl>
    </Card>
  );
}

export default function LeaveBalanceCards({ balances = [], className }) {
  if (balances.length === 0) return null;

  return (
    <div
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}
    >
      {balances.map((balance) => (
        <BalanceCard key={balance.code} balance={balance} />
      ))}
    </div>
  );
}
