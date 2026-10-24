import { useState } from "react";
import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Textarea from "@/components/ui/Textarea";
import { smartLeave } from "@/api/ai.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";

export default function SmartLeaveBox({ onSuggestion, typeName = () => "" }) {
  const mountedRef = useMountedRef();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [error, setError] = useState("");

  const handleFill = async () => {
    if (busy) return;
    if (text.trim().length < 3) {
      setError("Describe the leave in a few words");
      return;
    }

    setBusy(true);
    setError("");
    setNote(null);

    try {
      const result = await smartLeave(text.trim());
      if (!mountedRef.current) return;

      if (result?.fallback) {
        setNote({
          tone: "plain",
          text: "Could not understand, please fill the form.",
        });
        return;
      }

      onSuggestion(result);
      setNote({
        tone: result.valid === false ? "warning" : "ok",
        text:
          result.valid === false
            ? `AI-generated: ${result.problem}. Check the dates and confirm.`
            : `AI-generated: ${typeName(result.type) || result.type}, ${formatDate(
                result.startDate
              )} to ${formatDate(result.endDate)}, ${result.days} working day(s). Check the dates and confirm.`,
      });
    } catch (failure) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold tracking-tight">Fill the form for me</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe your leave in plain words. Nothing is submitted until you press
        Apply.
      </p>

      <div className="mt-4 space-y-3">
        <Textarea
          label="Describe your leave"
          rows={2}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          placeholder="I need sick leave tomorrow and the day after"
        />

        <Button variant="secondary" onClick={handleFill} loading={busy}>
          Fill the form for me
        </Button>

        {note ? (
          <p
            className={
              note.tone === "warning"
                ? "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-danger"
                : "rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground"
            }
            role="status"
          >
            {note.text}
          </p>
        ) : null}

        <FormError>{error}</FormError>
      </div>
    </Card>
  );
}
