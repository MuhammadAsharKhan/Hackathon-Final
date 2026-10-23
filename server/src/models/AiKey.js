import mongoose from "mongoose";

const aiKeySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["gemini", "grok"],
      required: true,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: [60, "Label is too long"],
      default: "",
    },
    encryptedKey: {
      type: String,
      required: true,
      select: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "invalid"],
      default: "active",
    },
    cooldownUntil: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: "",
      maxlength: [160, "Error is too long"],
    },
  },
  { timestamps: true }
);

aiKeySchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.encryptedKey;
    delete json.__v;
    return json;
  },
});

const AiKey = mongoose.model("AiKey", aiKeySchema);

export default AiKey;
