import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import SectionHeading from "@/components/ui/SectionHeading";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

export default function AiSettingsForm({
  form,
  errors,
  formError,
  saving,
  onChange,
  onSubmit,
}) {
  return (
    <section className="space-y-4">
      <SectionHeading title="Settings" />

      <Card className="p-6">
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Default provider"
              value={form.defaultProvider}
              onChange={onChange("defaultProvider")}
              error={errors.defaultProvider}
            >
              <option value="gemini">Gemini</option>
              <option value="grok">Grok</option>
            </Select>
            <div />
            <Input
              label="Gemini model"
              value={form.geminiModel}
              onChange={onChange("geminiModel")}
              error={errors.geminiModel}
            />
            <Input
              label="Gemini base URL"
              value={form.geminiBaseUrl}
              onChange={onChange("geminiBaseUrl")}
              error={errors.geminiBaseUrl}
            />
            <Input
              label="Grok model"
              value={form.grokModel}
              onChange={onChange("grokModel")}
              error={errors.grokModel}
            />
            <Input
              label="Grok base URL"
              value={form.grokBaseUrl}
              onChange={onChange("grokBaseUrl")}
              error={errors.grokBaseUrl}
            />
          </div>

          <Textarea
            label="System prompt"
            rows={5}
            value={form.systemPrompt}
            onChange={onChange("systemPrompt")}
            error={errors.systemPrompt}
          />

          <FormError>{formError}</FormError>

          <Button type="submit" loading={saving}>
            Save settings
          </Button>
        </form>
      </Card>
    </section>
  );
}
