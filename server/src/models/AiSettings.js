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
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const AiSettings = mongoose.model("AiSettings", aiSettingsSchema);

export default AiSettings;
