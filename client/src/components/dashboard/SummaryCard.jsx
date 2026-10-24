import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { dashboardSummary } from "@/api/ai.api";
import { getErrorMessage } from "@/lib/errors";

export default function SummaryCard({ filters }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const filterKey = `${filters.from}|${filters.to}|${filters.departmentId || ""}`;

  // A summary describes one set of filters, so a change drops the old text
  // instead of showing numbers that no longer match the page.
  useEffect(() => {
    setSummary(null);
    setError("");
  }, [filterKey]);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const result = await dashboardSummary({
        from: filters.from,
        to: filters.to,
        departmentId: filters.departmentId || undefined,
      });
      setSummary(result);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">Summary</h2>
            {summary?.aiGenerated ? (
              <StatusBadge tone="accent">AI-generated</StatusBadge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Three to five plain lines about the range on this page.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={run} loading={loading}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Summarize
        </Button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !summary ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-9/12" />
          <div className="skeleton h-3 w-10/12" />
        </div>
      ) : null}

      {summary && !loading ? (
        <div className="mt-4 space-y-3">
          <ul className="space-y-2 text-sm">
            {(summary.bullets || []).map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {summary.fallback ? (
            <p className="text-xs text-muted-foreground">
              The model could not be reached, so these lines were built from the same
              numbers on the server.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
