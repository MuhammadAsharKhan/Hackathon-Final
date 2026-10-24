import { FlaskConical, KeyRound, Plus, Power, Trash2 } from "lucide-react";
import KeyStatusBadge from "@/components/ai/KeyStatusBadge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeading from "@/components/ui/SectionHeading";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import { providerLabel } from "@/lib/ai";
import { cn } from "@/lib/cn";

const COLUMNS = [
  "Provider",
  "Label",
  "Key",
  "Status",
  "Uses",
  "Last error",
  "Actions",
];

export default function AdminKeysTable({
  keys,
  busyKeyId,
  keyTestResults,
  now,
  onAdd,
  onTest,
  onReplace,
  onToggle,
  onDelete,
}) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Provider keys"
        actions={
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add key
          </Button>
        }
      />

      {keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No keys yet"
          description="Add a provider key so the assistant can answer."
        />
      ) : (
        <Table columns={COLUMNS}>
          {keys.map((keyRecord) => {
            const testResult = keyTestResults[keyRecord.id];

            return (
              <TableRow key={keyRecord.id}>
                <TableCell className="font-medium">
                  {providerLabel(keyRecord.provider)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {keyRecord.label || "-"}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs">
                    {keyRecord.maskedKey}
                  </span>
                </TableCell>
                <TableCell>
                  <KeyStatusBadge keyRecord={keyRecord} now={now} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {keyRecord.usageCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span
                    className="block max-w-[12rem] truncate text-xs"
                    title={keyRecord.lastError || undefined}
                  >
                    {keyRecord.lastError || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Test ${keyRecord.label || "key"}`}
                      title="Test key"
                      onClick={() => onTest(keyRecord)}
                      disabled={busyKeyId === keyRecord.id}
                    >
                      <FlaskConical className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Replace ${keyRecord.label || "key"}`}
                      title="Replace key"
                      onClick={() => onReplace(keyRecord)}
                      disabled={busyKeyId === keyRecord.id}
                    >
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground"
                      aria-label={
                        keyRecord.enabled
                          ? `Disable ${keyRecord.label || "key"}`
                          : `Enable ${keyRecord.label || "key"}`
                      }
                      title={
                        keyRecord.enabled ? "Disable key" : "Enable key"
                      }
                      onClick={() => onToggle(keyRecord)}
                      disabled={busyKeyId === keyRecord.id}
                    >
                      <Power className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 w-10 px-0 text-muted-foreground hover:text-danger"
                      aria-label={`Delete ${keyRecord.label || "key"}`}
                      title="Delete key"
                      onClick={() => onDelete(keyRecord)}
                      disabled={busyKeyId === keyRecord.id}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {busyKeyId === keyRecord.id ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Working
                    </p>
                  ) : null}

                  {testResult ? (
                    <p
                      className={cn(
                        "mt-1 max-w-[14rem] truncate text-xs",
                        testResult.ok ? "text-success" : "text-danger"
                      )}
                      title={
                        testResult.ok ? testResult.reply : testResult.error
                      }
                    >
                      {testResult.ok
                        ? `Reply: ${testResult.reply}`
                        : testResult.error}
                    </p>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </Table>
      )}

      <p className="text-xs text-muted-foreground">
        All grok keys must come from the same vendor. A replacement key resets
        its status and cooldown.
      </p>
    </section>
  );
}
