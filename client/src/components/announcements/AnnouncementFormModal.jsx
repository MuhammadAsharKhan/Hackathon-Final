import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import { createAnnouncement } from "@/api/announcements.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const EMPTY_FORM = { title: "", body: "" };

const validate = (form) => {
  const errors = {};

  if (form.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
  }
  if (form.body.trim().length < 3) {
    errors.body = "Body must be at least 3 characters";
  }

  return errors;
};

export default function AnnouncementFormModal({ open, onClose, onPosted }) {
  const mountedRef = useMountedRef();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
      });
      if (!mountedRef.current) return;

      setForm(EMPTY_FORM);
      toast.success("Announcement posted");
      onPosted();
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
      onClose={close}
      title="New announcement"
      description="Every active user is notified when you post."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Post announcement
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Title"
          value={form.title}
          onChange={update("title")}
          error={fieldErrors.title}
        />
        <Textarea
          label="Body"
          rows={6}
          value={form.body}
          onChange={update("body")}
          error={fieldErrors.body}
        />

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
