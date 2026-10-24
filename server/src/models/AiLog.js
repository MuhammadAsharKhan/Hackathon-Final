import mongoose from "mongoose";

const aiLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    role: {
      type: String,
      default: "",
    },
    kind: {
      type: String,
      enum: ["chat", "summary", "smart_leave"],
      required: true,
    },
    message: {
      type: String,
      default: "",
      maxlength: [500, "Message is too long"],
    },
    toolsUsed: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["ok", "error", "timeout"],
      default: "ok",
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: "",
      maxlength: [300, "Error is too long"],
    },
  },
  { timestamps: true }
);

aiLogSchema.index({ createdAt: -1 });

aiLogSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const AiLog = mongoose.model("AiLog", aiLogSchema);

export default AiLog;
