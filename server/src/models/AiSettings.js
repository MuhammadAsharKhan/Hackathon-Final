import mongoose from "mongoose";

const aiSettingsSchema = new mongoose.Schema(
  {
    defaultProvider: {
      type: String,
      enum: ["gemini", "grok"],
      default: "gemini",
    },
    geminiModel: {
      type: String,
      default: "",
    },
    geminiBaseUrl: {
      type: String,
      default: "",
    },
    grokModel: {
      type: String,
      default: "",
    },
    grokBaseUrl: {
      type: String,
      default: "",
    },
    systemPrompt: {
      type: String,
      default: "",
      maxlength: [2000, "System prompt is too long"],
    },
  },
  { timestamps: true }
);

aiSettingsSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const AiSettings = mongoose.model("AiSettings", aiSettingsSchema);

export default AiSettings;
