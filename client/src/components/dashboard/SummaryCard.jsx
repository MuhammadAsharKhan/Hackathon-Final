import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusBadge";
import { dashboardSummary } from "@/api/ai.api";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";

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
    <div className="relative overflow-hidden rounded-card p-px">
      {/* 1px gradient border; the conic sweep only turns while loading */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-[-45%]",
          loading && "animate-spin-slow"
        )}
        style={{
          background:
            "conic-gradient(from 0deg, #1C74EF 0%, #88C443 35%, #1C74EF 70%, #88C443 100%)",
        }}
      />

      <div className="relative rounded-[19px] bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-blue-50 text-blue-700"
              aria-hidden="true"
            >
              <Sparkles className="h-[18px] w-[18px]" />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[17px] font-bold text-text">
                  Summary
                </h2>
                {summary?.aiGenerated ? (
                  <StatusPill tone="blue" size="sm">
                    AI-generated
                  </StatusPill>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted">
                Three to five plain lines about the range on this page.
              </p>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={run} loading={loading}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Summarize
          </Button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-status-rose" role="alert">
            {error}
          </p>
        ) : null}

        {loading && !summary ? (
          <div className="mt-4 space-y-2.5" aria-busy="true">
            <div className="skeleton h-3.5 w-11/12" />
            <div className="skeleton h-3.5 w-9/12" />
            <div className="skeleton h-3.5 w-10/12" />
          </div>
        ) : null}

        {summary && !loading ? (
          <div className="mt-4 space-y-3">
            <ul className="space-y-2.5">
              {(summary.bullets || []).map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5">
                  <span
                    className="mt-[7px] h-2 w-2 shrink-0 rounded-[2px] bg-blue"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-text">{bullet}</span>
                </li>
              ))}
            </ul>

            {summary.fallback ? (
              <p className="text-xs text-muted">
                The model could not be reached, so these lines were built from the
                same numbers on the server.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
