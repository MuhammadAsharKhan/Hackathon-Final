import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { createAiKey, updateAiKey } from "@/api/ai.api";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const EMPTY_FORM = { provider: "gemini", label: "", apiKey: "" };

export default function KeyFormModal({
  open,
  mode = "create",
  keyRecord,
  onClose,
  onSaved,
}) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setValues(
      mode === "replace" && keyRecord
        ? { provider: keyRecord.provider, label: keyRecord.label, apiKey: "" }
        : EMPTY_FORM
    );
    setErrors({});
    setFormError("");
    setSaving(false);
  }, [open, mode, keyRecord]);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!values.apiKey.trim()) nextErrors.apiKey = "Paste the API key";

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const data =
        mode === "replace"
          ? await updateAiKey(keyRecord.id, { apiKey: values.apiKey.trim() })
          : await createAiKey({
              provider: values.provider,
              label: values.label.trim(),
              apiKey: values.apiKey.trim(),
            });

      onSaved(data.key);
    } catch (requestError) {
      setErrors(getFieldErrors(requestError));
      setFormError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
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
      <form id="ai-key-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {mode === "replace" ? (
          <p className="text-sm text-muted-foreground">
            {keyRecord?.label || "This key"} on{" "}
            {keyRecord?.provider === "grok" ? "Grok" : "Gemini"}.
          </p>
        ) : (
          <>
            <Select
              label="Provider"
              value={values.provider}
              onChange={update("provider")}
              error={errors.provider}
            >
              <option value="gemini">Gemini</option>
              <option value="grok">Grok</option>
            </Select>
            <Input
              label="Label"
              value={values.label}
              onChange={update("label")}
              error={errors.label}
              maxLength={60}
              placeholder="For example: primary"
            />
          </>
        )}

        <Input
          label="API key"
          type="password"
          autoComplete="off"
          value={values.apiKey}
          onChange={update("apiKey")}
          error={errors.apiKey}
          placeholder="Paste the provider key"
        />

        <FormError bordered>{formError}</FormError>
      </form>
    </Modal>
  );
}
