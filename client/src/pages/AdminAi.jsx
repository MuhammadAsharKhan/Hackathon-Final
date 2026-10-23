import { useCallback, useEffect, useState } from "react";
import {
  FlaskConical,
  KeyRound,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import KeyFormModal from "@/components/ai/KeyFormModal";
import KeyStatusBadge from "@/components/ai/KeyStatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { Table, TableCell, TableRow } from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import {
  deleteAiKey,
  getAiSettings,
  listAiKeys,
  testAiKey,
  updateAiKey,
  updateAiSettings,
} from "@/api/ai.api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { providerLabel } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const COLUMNS = [
  "Provider",
  "Label",
  "Key",
  "Status",
  "Uses",
  "Last error",
  "Actions",
];

const toForm = (settings) => ({
  defaultProvider: settings.defaultProvider,
  geminiModel: settings.geminiModel,
  geminiBaseUrl: settings.geminiBaseUrl,
  grokModel: settings.grokModel,
  grokBaseUrl: settings.grokBaseUrl,
  systemPrompt: settings.systemPrompt,
});

export default function AdminAi() {
  useDocumentTitle("AI settings");

  const [keys, setKeys] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(Date.now());

  const [addOpen, setAddOpen] = useState(false);
  const [replacing, setReplacing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [testResults, setTestResults] = useState({});

  const [settingsErrors, setSettingsErrors] = useState({});
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [keyData, settingsData] = await Promise.all([
        listAiKeys(),
        getAiSettings(),
      ]);
      setKeys(keyData.keys);
      setForm(toForm(settingsData.settings));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshKeys = useCallback(async () => {
    const data = await listAiKeys();
    setKeys(data.keys);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const cooling = keys.some(
      (key) => key.cooldownUntil && new Date(key.cooldownUntil).getTime() > Date.now()
    );
    if (!cooling) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [keys]);

  const updateForm = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
    setSettingsErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleToggle = async (record) => {
    setBusyId(record.id);

    try {
      const data = await updateAiKey(record.id, { enabled: !record.enabled });
      setKeys((previous) =>
        previous.map((entry) => (entry.id === data.key.id ? data.key : entry))
      );
      toast.success(data.key.enabled ? "Key enabled" : "Key disabled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId("");
    }
  };

  const handleTest = async (record) => {
    setBusyId(record.id);
    setTestResults((previous) => ({ ...previous, [record.id]: null }));

    try {
      const data = await testAiKey(record.id);
      setTestResults((previous) => ({ ...previous, [record.id]: data }));
      await refreshKeys();
    } catch (error) {
      setTestResults((previous) => ({
        ...previous,
        [record.id]: { ok: false, error: getErrorMessage(error) },
      }));
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setDeleteLoading(true);

    try {
      await deleteAiKey(deleting.id);
      setKeys((previous) =>
        previous.filter((entry) => entry.id !== deleting.id)
      );
      setDeleting(null);
      toast.success("Key deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaved = (savedKey) => {
    const wasReplace = Boolean(replacing);

    setKeys((previous) => {
      const exists = previous.some((entry) => entry.id === savedKey.id);
      if (exists) {
        return previous.map((entry) =>
          entry.id === savedKey.id ? savedKey : entry
        );
      }
      return [...previous, savedKey];
    });

    setAddOpen(false);
    setReplacing(null);
    toast.success(wasReplace ? "Key replaced" : "Key added");
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.systemPrompt.trim()) nextErrors.systemPrompt = "System prompt is required";
    if (!form.geminiModel.trim()) nextErrors.geminiModel = "Model is required";
    if (!form.grokModel.trim()) nextErrors.grokModel = "Model is required";
    if (!form.geminiBaseUrl.trim()) nextErrors.geminiBaseUrl = "Base URL is required";
    if (!form.grokBaseUrl.trim()) nextErrors.grokBaseUrl = "Base URL is required";

    setSettingsErrors(nextErrors);
    setSettingsError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingSettings(true);

    try {
      const data = await updateAiSettings(form);
      setForm(toForm(data.settings));
      toast.success("Settings saved");
    } catch (error) {
      setSettingsErrors(getFieldErrors(error));
      setSettingsError(getErrorMessage(error));
    } finally {
      setSavingSettings(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI settings"
          description="Provider keys, models and the system prompt used by AI Buddy."
        />
        <ErrorState
          title="AI settings did not load"
          message={loadError}
          onRetry={load}
        />
      </div>
    );
  }

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI settings"
          description="Provider keys, models and the system prompt used by AI Buddy."
        />
        <div className="space-y-3" aria-hidden="true">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="AI settings"
        description="Provider keys, models and the system prompt used by AI Buddy."
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Provider keys</h2>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add key
          </Button>
        </div>

        {keys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No keys yet"
            description="Add a provider key so AI Buddy can answer."
          />
        ) : (
          <Table columns={COLUMNS}>
            {keys.map((record) => {
              const result = testResults[record.id];

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {providerLabel(record.provider)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.label || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">
                      {record.maskedKey}
                    </span>
                  </TableCell>
                  <TableCell>
                    <KeyStatusBadge keyRecord={record} now={now} />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {record.usageCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span
                      className="block max-w-[12rem] truncate text-xs"
                      title={record.lastError || undefined}
                    >
                      {record.lastError || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        className="h-9 w-9 px-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Test ${record.label || "key"}`}
                        title="Test key"
                        onClick={() => handleTest(record)}
                        disabled={busyId === record.id}
                      >
                        <FlaskConical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 px-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Replace ${record.label || "key"}`}
                        title="Replace key"
                        onClick={() => setReplacing(record)}
                        disabled={busyId === record.id}
                      >
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 px-0 text-muted-foreground hover:text-foreground"
                        aria-label={
                          record.enabled
                            ? `Disable ${record.label || "key"}`
                            : `Enable ${record.label || "key"}`
                        }
                        title={record.enabled ? "Disable key" : "Enable key"}
                        onClick={() => handleToggle(record)}
                        disabled={busyId === record.id}
                      >
                        <Power className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9 w-9 px-0 text-muted-foreground hover:text-danger"
                        aria-label={`Delete ${record.label || "key"}`}
                        title="Delete key"
                        onClick={() => setDeleting(record)}
                        disabled={busyId === record.id}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    {busyId === record.id ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Working
                      </p>
                    ) : null}

                    {result ? (
                      <p
                        className={cn(
                          "mt-1 max-w-[14rem] truncate text-xs",
                          result.ok ? "text-success" : "text-danger"
                        )}
                        title={result.ok ? result.reply : result.error}
                      >
                        {result.ok ? `Reply: ${result.reply}` : result.error}
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        )}

        <p className="text-xs text-muted-foreground">
          All grok keys must come from the same vendor. A replacement key
          resets its status and cooldown.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Settings</h2>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSettingsSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Default provider"
                value={form.defaultProvider}
                onChange={updateForm("defaultProvider")}
                error={settingsErrors.defaultProvider}
              >
                <option value="gemini">Gemini</option>
                <option value="grok">Grok</option>
              </Select>
              <div />
              <Input
                label="Gemini model"
                value={form.geminiModel}
                onChange={updateForm("geminiModel")}
                error={settingsErrors.geminiModel}
              />
              <Input
                label="Gemini base URL"
                value={form.geminiBaseUrl}
                onChange={updateForm("geminiBaseUrl")}
                error={settingsErrors.geminiBaseUrl}
              />
              <Input
                label="Grok model"
                value={form.grokModel}
                onChange={updateForm("grokModel")}
                error={settingsErrors.grokModel}
              />
              <Input
                label="Grok base URL"
                value={form.grokBaseUrl}
                onChange={updateForm("grokBaseUrl")}
                error={settingsErrors.grokBaseUrl}
              />
            </div>

            <Textarea
              label="System prompt"
              rows={5}
              value={form.systemPrompt}
              onChange={updateForm("systemPrompt")}
              error={settingsErrors.systemPrompt}
            />

            <FormError>{settingsError}</FormError>

            <Button type="submit" loading={savingSettings}>
              Save settings
            </Button>
          </form>
        </Card>
      </section>

      <KeyFormModal
        open={addOpen}
        mode="create"
        onClose={() => setAddOpen(false)}
        onSaved={handleSaved}
      />

      <KeyFormModal
        open={Boolean(replacing)}
        mode="replace"
        keyRecord={replacing}
        onClose={() => setReplacing(null)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!deleteLoading) setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Delete key"
        description={
          deleting
            ? `The ${deleting.label || providerLabel(deleting.provider)} key will stop being used.`
            : undefined
        }
        loading={deleteLoading}
      />
    </div>
  );
}
