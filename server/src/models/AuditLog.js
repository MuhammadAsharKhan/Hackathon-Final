import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorName: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entity: {
      type: String,
      default: "",
      index: true,
    },
    entityId: {
      type: String,
      default: "",
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

const REJECTED = "Audit entries are append-only";

// Nothing may rewrite or remove history. Mongoose hooks cover the query
// helpers, and the collection level guard covers the driver itself.
const reject = () => {
  throw new Error(REJECTED);
};

auditLogSchema.pre("save", function rejectExistingDocument(next) {
  if (!this.isNew) return next(new Error(REJECTED));
  return next();
});

for (const operation of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndReplace",
]) {
  auditLogSchema.pre(operation, function rejectQueryOperation() {
    throw new Error(REJECTED);
  });
}

auditLogSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
