import mongoose from "mongoose";
import { createUid } from "../utils/uid.js";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [8000, "Message is too long"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      unique: true,
      immutable: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, "Title is too long"],
      default: "",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

conversationSchema.index({ owner: 1, updatedAt: -1 });

conversationSchema.pre("validate", async function assignUid() {
  if (!this.isNew || this.uid) return;
  this.uid = await createUid(this.constructor);
});

conversationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
