import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { createAiKey, updateAiKey } from "@/api/ai.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const EMPTY_FORM = { provider: "gemini", label: "", apiKey: "" };

export default function KeyFormModal({
  open,
  mode = "create",
  keyRecord,
  onClose,
  onSaved,
}) {
  const [keyForm, setKeyForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const mountedRef = useMountedRef();

  useEffect(() => {
    if (!open) return;

    setKeyForm(
      mode === "replace" && keyRecord
        ? {
            provider: keyRecord.provider,
            label: keyRecord.label,
            apiKey: "",
          }
        : EMPTY_FORM
    );
    setFieldErrors({});
    setFormError("");
    setSaving(false);
  }, [open, mode, keyRecord]);

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setKeyForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const saveKey = async () => {
    if (mode === "replace") {
      return updateAiKey(keyRecord.id, {
        apiKey: keyForm.apiKey.trim(),
      });
    }

    return createAiKey({
      provider: keyForm.provider,
      label: keyForm.label.trim(),
      apiKey: keyForm.apiKey.trim(),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = {};
    if (!keyForm.apiKey.trim()) {
      nextErrors.apiKey = "Paste the API key";
    }

    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const keyData = await saveKey();
      if (!mountedRef.current) return;
      onSaved(keyData.key);
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "replace" ? "Replace key" : "Add key"}
      description={
        mode === "replace"
          ? "The new key resets the status, cooldown and last error."
          : "Keys are stored encrypted. Only the last four characters are shown."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="ai-key-form" loading={saving}>
            {mode === "replace" ? "Replace key" : "Add key"}
          </Button>
        </>
      }
    >
      <form
        id="ai-key-form"
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        {mode === "replace" ? (
          <p className="text-sm text-muted-foreground">
            {keyRecord?.label || "This key"} on{" "}
            {keyRecord?.provider === "grok" ? "Grok" : "Gemini"}.
          </p>
        ) : (
          <>
            <Select
              label="Provider"
              value={keyForm.provider}
              onChange={updateField("provider")}
              error={fieldErrors.provider}
            >
              <option value="gemini">Gemini</option>
              <option value="grok">Grok</option>
            </Select>
            <Input
              label="Label"
              value={keyForm.label}
              onChange={updateField("label")}
              error={fieldErrors.label}
              maxLength={60}
              placeholder="For example: primary"
            />
          </>
        )}

        <Input
          label="API key"
          type="password"
          autoComplete="off"
          value={keyForm.apiKey}
          onChange={updateField("apiKey")}
          error={fieldErrors.apiKey}
          placeholder="Paste the provider key"
        />

        <FormError bordered>{formError}</FormError>
      </form>
    </Modal>
  );
}
