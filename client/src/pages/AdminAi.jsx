import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminKeysTable from "@/components/ai/AdminKeysTable";
import AiSettingsForm from "@/components/ai/AiSettingsForm";
import KeyFormModal from "@/components/ai/KeyFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import {
  deleteAiKey,
  getAiSettings,
  listAiKeys,
  testAiKey,
  updateAiKey,
  updateAiSettings,
} from "@/api/ai.api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMountedRef } from "@/hooks/useMountedRef";
import { providerLabel } from "@/lib/ai";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const toSettingsForm = (settings) => ({
  defaultProvider: settings.defaultProvider,
  geminiModel: settings.geminiModel,
  geminiBaseUrl: settings.geminiBaseUrl,
  grokModel: settings.grokModel,
  grokBaseUrl: settings.grokBaseUrl,
  systemPrompt: settings.systemPrompt,
});

export default function AdminAi() {
  useDocumentTitle("AI keys");

  const [keyRecords, setKeyRecords] = useState([]);
  const [settingsForm, setSettingsForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(Date.now());
  const mountedRef = useMountedRef();

  const [addOpen, setAddOpen] = useState(false);
  const [replacing, setReplacing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState("");
  const [keyTestResults, setKeyTestResults] = useState({});

  const [settingsErrors, setSettingsErrors] = useState({});
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [keyData, settingsData] = await Promise.all([
        listAiKeys(),
        getAiSettings(),
      ]);
      if (!mountedRef.current) return;
      setKeyRecords(keyData.keys);
      setSettingsForm(toSettingsForm(settingsData.settings));
    } catch (error) {
      if (!mountedRef.current) return;
      setLoadError(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  const reloadKeys = useCallback(async () => {
    const keyData = await listAiKeys();
    if (mountedRef.current) setKeyRecords(keyData.keys);
  }, [mountedRef]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    const hasCoolingKey = keyRecords.some(
      (keyRecord) =>
        keyRecord.cooldownUntil &&
        new Date(keyRecord.cooldownUntil).getTime() > Date.now()
    );
    if (!hasCoolingKey) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [keyRecords]);

  const changeSettingsField = (field) => (event) => {
    const { value } = event.target;
    setSettingsForm((previous) => ({ ...previous, [field]: value }));
    setSettingsErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const handleToggle = async (keyRecord) => {
    if (busyKeyId) return;
    setBusyKeyId(keyRecord.id);

    try {
      const keyData = await updateAiKey(keyRecord.id, {
        enabled: !keyRecord.enabled,
      });
      if (!mountedRef.current) return;

      setKeyRecords((previous) =>
        previous.map((keyRecord) =>
          keyRecord.id === keyData.key.id ? keyData.key : keyRecord
        )
      );
      toast.success(keyData.key.enabled ? "Key enabled" : "Key disabled");
    } catch (error) {
      if (!mountedRef.current) return;
      toast.error(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setBusyKeyId("");
    }
  };

  const handleTest = async (keyRecord) => {
    if (busyKeyId) return;
    setBusyKeyId(keyRecord.id);
    setKeyTestResults((previous) => ({
      ...previous,
      [keyRecord.id]: null,
    }));

    try {
      const testResult = await testAiKey(keyRecord.id);
      if (!mountedRef.current) return;

      setKeyTestResults((previous) => ({
        ...previous,
        [keyRecord.id]: testResult,
      }));
      await reloadKeys();
    } catch (error) {
      if (!mountedRef.current) return;
      setKeyTestResults((previous) => ({
        ...previous,
        [keyRecord.id]: { ok: false, error: getErrorMessage(error) },
      }));
    } finally {
      if (mountedRef.current) setBusyKeyId("");
    }
  };

  const handleDelete = async () => {
    if (!deleting || deleteLoading) return;

    setDeleteLoading(true);

    try {
      await deleteAiKey(deleting.id);
      if (!mountedRef.current) return;

      setKeyRecords((previous) =>
        previous.filter((keyRecord) => keyRecord.id !== deleting.id)
      );
      setDeleting(null);
      toast.success("Key deleted");
    } catch (error) {
      if (!mountedRef.current) return;
      toast.error(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setDeleteLoading(false);
    }
  };

  const handleKeySaved = (savedKey) => {
    const wasReplace = Boolean(replacing);

    setKeyRecords((previous) => {
      const keyExists = previous.some(
        (keyRecord) => keyRecord.id === savedKey.id
      );
      if (keyExists) {
        return previous.map((keyRecord) =>
          keyRecord.id === savedKey.id ? savedKey : keyRecord
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
    if (savingSettings) return;

    const nextErrors = {};
    if (!settingsForm.systemPrompt.trim()) {
      nextErrors.systemPrompt = "System prompt is required";
    }
    if (!settingsForm.geminiModel.trim()) {
      nextErrors.geminiModel = "Model is required";
    }
    if (!settingsForm.grokModel.trim()) {
      nextErrors.grokModel = "Model is required";
    }
    if (!settingsForm.geminiBaseUrl.trim()) {
      nextErrors.geminiBaseUrl = "Base URL is required";
    }
    if (!settingsForm.grokBaseUrl.trim()) {
      nextErrors.grokBaseUrl = "Base URL is required";
    }

    setSettingsErrors(nextErrors);
    setSettingsError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSavingSettings(true);

    try {
      const settingsData = await updateAiSettings({
        defaultProvider: settingsForm.defaultProvider,
        geminiModel: settingsForm.geminiModel.trim(),
        geminiBaseUrl: settingsForm.geminiBaseUrl.trim(),
        grokModel: settingsForm.grokModel.trim(),
        grokBaseUrl: settingsForm.grokBaseUrl.trim(),
        systemPrompt: settingsForm.systemPrompt.trim(),
      });
      if (!mountedRef.current) return;

      setSettingsForm(toSettingsForm(settingsData.settings));
      setSettingsErrors({});
      setSettingsError("");
      toast.success("Settings saved");
    } catch (error) {
      if (!mountedRef.current) return;
      setSettingsErrors(getFieldErrors(error));
      setSettingsError(getErrorMessage(error));
    } finally {
      if (mountedRef.current) setSavingSettings(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI keys"
          description="Provider keys, models and the system prompt used by the assistant."
        />
        <ErrorState
          title="AI keys did not load"
          message={loadError}
          onRetry={loadAdminData}
        />
      </div>
    );
  }

  if (loading || !settingsForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI keys"
          description="Provider keys, models and the system prompt used by the assistant."
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
        title="AI keys"
        description="Provider keys, models and the system prompt used by the assistant."
      />

      <AdminKeysTable
        keys={keyRecords}
        busyKeyId={busyKeyId}
        keyTestResults={keyTestResults}
        now={now}
        onAdd={() => setAddOpen(true)}
        onTest={handleTest}
        onReplace={setReplacing}
        onToggle={handleToggle}
        onDelete={setDeleting}
      />

      <AiSettingsForm
        form={settingsForm}
        errors={settingsErrors}
        formError={settingsError}
        saving={savingSettings}
        onChange={changeSettingsField}
        onSubmit={handleSettingsSubmit}
      />

      <KeyFormModal
        open={addOpen}
        mode="create"
        onClose={() => setAddOpen(false)}
        onSaved={handleKeySaved}
      />

      <KeyFormModal
        open={Boolean(replacing)}
        mode="replace"
        keyRecord={replacing}
        onClose={() => setReplacing(null)}
        onSaved={handleKeySaved}
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
            ? `The ${
                deleting.label || providerLabel(deleting.provider)
              } key will stop being used.`
            : undefined
        }
        loading={deleteLoading}
      />
    </div>
  );
}
