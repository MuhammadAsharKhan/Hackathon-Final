import AuditLog from "../models/AuditLog.js";

// Secrets never reach the audit trail, even when a caller passes a whole user
// or settings document as the before or after value.
const SENSITIVE_KEY = /pass(word)?|hash|token|secret|otp|credential/i;

const withoutSecrets = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(withoutSecrets);

  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if (typeof value.toObject === "function") return withoutSecrets(value.toObject());

  const cleaned = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) continue;
    cleaned[key] = withoutSecrets(entry);
  }

  return cleaned;
};

export const log = async (
  actor,
  action,
  entity,
  entityId = "",
  before = null,
  after = null
) => {
  await AuditLog.create({
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "",
    actorRole: actor?.role ?? "",
    action,
    entity,
    entityId: entityId ? String(entityId) : "",
    before: withoutSecrets(before),
    after: withoutSecrets(after),
  });
};
