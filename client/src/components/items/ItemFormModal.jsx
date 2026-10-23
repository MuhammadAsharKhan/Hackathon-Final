import { STATUS_LABELS } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

export default function ItemFormModal({
  open,
  editing,
  form,
  errors,
  formError,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit item" : "New item"}
      description={
        editing
          ? "Change the details, then save."
          : "Add a title, then set the status as work moves."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="item-form"
        className="space-y-4"
        onSubmit={onSubmit}
        noValidate
      >
        <Input
          label="Title"
          value={form.title}
          onChange={onChange("title")}
          error={errors.title}
          maxLength={120}
          autoComplete="off"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={onChange("description")}
          error={errors.description}
          hint="Optional. Up to 2000 characters."
          maxLength={2000}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={onChange("status")}
          error={errors.status}
        >
          <option value="todo">{STATUS_LABELS.todo}</option>
          <option value="in_progress">{STATUS_LABELS.in_progress}</option>
          <option value="done">{STATUS_LABELS.done}</option>
        </Select>

        <FormError>{formError}</FormError>
      </form>
    </Modal>
  );
}
