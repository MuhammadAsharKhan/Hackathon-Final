import { useState } from "react";
import { MapPin } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import ErrorState from "@/components/ui/ErrorState";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getSettings, updateSettings } from "@/api/settings.api";
import { useMountedRef } from "@/hooks/useMountedRef";
import { useResource } from "@/hooks/useResource";
import { WEEKDAYS, timezoneChoices } from "@/lib/dates";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const toForm = (settings) => ({
  companyName: settings.companyName || "",
  timezone: settings.timezone || "Asia/Karachi",
  officeStart: settings.officeStart || "09:00",
  graceMinutes: String(settings.graceMinutes ?? 15),
  halfDayHours: String(settings.halfDayHours ?? 5),
  weekendDays: settings.weekendDays || [],
  officeLat:
    settings.officeLat === null || settings.officeLat === undefined
      ? ""
      : String(settings.officeLat),
  officeLng:
    settings.officeLng === null || settings.officeLng === undefined
      ? ""
      : String(settings.officeLng),
  radiusMeters: String(settings.radiusMeters ?? 150),
  weeklyHours: String(settings.weeklyHours ?? 40),
});

const toPayload = (form) => ({
  companyName: form.companyName.trim(),
  timezone: form.timezone,
  officeStart: form.officeStart,
  graceMinutes: Number(form.graceMinutes),
  halfDayHours: Number(form.halfDayHours),
  weekendDays: form.weekendDays,
  officeLat: form.officeLat === "" ? null : Number(form.officeLat),
  officeLng: form.officeLng === "" ? null : Number(form.officeLng),
  radiusMeters: Number(form.radiusMeters),
  weeklyHours: Number(form.weeklyHours),
});

const validate = (form) => {
  const errors = {};

  if (!form.companyName.trim()) errors.companyName = "Company name is required";
  if (!form.officeStart) errors.officeStart = "Office start time is required";

  const grace = Number(form.graceMinutes);
  if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
    errors.graceMinutes = "Use a whole number between 0 and 120";
  }

  const halfDay = Number(form.halfDayHours);
  if (!(halfDay >= 1 && halfDay <= 12)) {
    errors.halfDayHours = "Use a value between 1 and 12";
  }

  const weekly = Number(form.weeklyHours);
  if (!(weekly >= 1 && weekly <= 168)) {
    errors.weeklyHours = "Use a value between 1 and 168";
  }

  const radius = Number(form.radiusMeters);
  if (!Number.isInteger(radius) || radius < 10 || radius > 5000) {
    errors.radiusMeters = "Use a whole number between 10 and 5000";
  }

  if (form.officeLat !== "") {
    const lat = Number(form.officeLat);
    if (!(lat >= -90 && lat <= 90)) errors.officeLat = "Latitude is -90 to 90";
  }

  if (form.officeLng !== "") {
    const lng = Number(form.officeLng);
    if (!(lng >= -180 && lng <= 180)) errors.officeLng = "Longitude is -180 to 180";
  }

  return errors;
};

export default function CompanySettings() {
  const { data, loading, error, reload, setData } = useResource(
    () => getSettings(),
    []
  );
  const mountedRef = useMountedRef();

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Company settings did not load"
        message={error}
        onRetry={reload}
      />
    );
  }

  const settings = data.settings;
  const current = form || toForm(settings);

  const update = (field) => (event) => {
    const { value, type, checked } = event.target;
    setForm((previous) => ({
      ...(previous || current),
      [field]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const toggleWeekend = (day, checked) => {
    setForm((previous) => {
      const base = previous || current;
      const days = new Set(base.weekendDays);
      if (checked) days.add(day);
      else days.delete(day);
      return { ...base, weekendDays: [...days].sort() };
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser cannot read your location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...(previous || current),
          officeLat: position.coords.latitude.toFixed(6),
          officeLng: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success("Coordinates filled from this device");
      },
      () => {
        setLocating(false);
        toast.error("Could not read your location. Enter the coordinates by hand.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(current);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      const result = await updateSettings(toPayload(current));
      if (!mountedRef.current) return;

      setData(result);
      setForm(toForm(result.settings));
      setFieldErrors({});
      toast.success("Settings saved");
    } catch (failure) {
      if (!mountedRef.current) return;
      setFieldErrors(getFieldErrors(failure));
      setFormError(getErrorMessage(failure));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <Card className="p-6">
        <h2 className="text-base font-semibold tracking-tight">Company</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            value={current.companyName}
            onChange={update("companyName")}
            error={fieldErrors.companyName}
          />
          <Select
            label="Timezone"
            value={current.timezone}
            onChange={update("timezone")}
            error={fieldErrors.timezone}
          >
            {timezoneChoices(current.timezone).map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold tracking-tight">Office hours</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Office start"
            type="time"
            value={current.officeStart}
            onChange={update("officeStart")}
            error={fieldErrors.officeStart}
            hint="Late is decided after the grace minutes."
          />
          <Input
            label="Grace minutes"
            type="number"
            min={0}
            max={120}
            step={1}
            value={current.graceMinutes}
            onChange={update("graceMinutes")}
            error={fieldErrors.graceMinutes}
          />
          <Input
            label="Half day hours"
            type="number"
            min={1}
            max={12}
            step={0.5}
            value={current.halfDayHours}
            onChange={update("halfDayHours")}
            error={fieldErrors.halfDayHours}
          />
          <Input
            label="Weekly hours"
            type="number"
            min={1}
            max={168}
            step={1}
            value={current.weeklyHours}
            onChange={update("weeklyHours")}
            error={fieldErrors.weeklyHours}
          />
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">Weekend days</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {WEEKDAYS.map((day) => (
              <Checkbox
                key={day.value}
                label={day.label}
                checked={current.weekendDays.includes(day.value)}
                onChange={(event) =>
                  toggleWeekend(day.value, event.target.checked)
                }
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold tracking-tight">Office location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Camera check-ins are accepted only inside the radius.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input
            label="Latitude"
            inputMode="decimal"
            value={current.officeLat}
            onChange={update("officeLat")}
            error={fieldErrors.officeLat}
          />
          <Input
            label="Longitude"
            inputMode="decimal"
            value={current.officeLng}
            onChange={update("officeLng")}
            error={fieldErrors.officeLng}
          />
          <Input
            label="Radius in meters"
            type="number"
            min={10}
            max={5000}
            step={10}
            value={current.radiusMeters}
            onChange={update("radiusMeters")}
            error={fieldErrors.radiusMeters}
          />
        </div>

        <Button
          variant="secondary"
          className="mt-4"
          onClick={useCurrentLocation}
          loading={locating}
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Use my current location
        </Button>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormError>{formError}</FormError>
        <Button type="submit" loading={saving} className="sm:ml-auto">
          Save changes
        </Button>
      </div>
    </form>
  );
}
