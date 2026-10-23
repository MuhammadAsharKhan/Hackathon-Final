import AvatarUpload from "@/components/profile/AvatarUpload";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { GENDER_OPTIONS } from "@/lib/validation";

export default function AccountPanel({
  user,
  account,
  errors,
  formError,
  saving,
  onChange,
  onSubmit,
}) {
  return (
    <Card className="p-6">
      <AvatarUpload />

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            autoComplete="name"
            value={account.name}
            onChange={onChange("name")}
            error={errors.name}
          />
          <Input
            label="Age"
            type="number"
            inputMode="numeric"
            min={1}
            max={150}
            step={1}
            value={account.age}
            onChange={onChange("age")}
            error={errors.age}
          />
          <Select
            label="Gender"
            value={account.gender}
            onChange={onChange("gender")}
            error={errors.gender}
          >
            <option value="">Not set</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={user?.email || ""}
            readOnly
            className="bg-surface text-muted-foreground"
          />
        </div>

        <div className="flex items-end gap-2">
          <Input
            label="User ID"
            value={user?.uid || ""}
            readOnly
            className="bg-surface font-mono tabular-nums text-muted-foreground"
          />
          <CopyButton
            value={user?.uid || ""}
            label="Copy user id"
            className="mb-1"
          />
        </div>

        <FormError>{formError}</FormError>

        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}
