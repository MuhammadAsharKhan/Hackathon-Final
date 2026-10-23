import mongoose from "mongoose";
import { createUid } from "../utils/uid.js";

const itemSchema = new mongoose.Schema(
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
      required: [true, "Title is required"],
      trim: true,
      minlength: [1, "Title must be at least 1 character"],
      maxlength: [120, "Title must be at most 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
    },
  },
  { timestamps: true }
);

itemSchema.index({ owner: 1, createdAt: -1 });

itemSchema.pre("validate", async function assignUid() {
  if (!this.isNew || this.uid) return;
  this.uid = await createUid(this.constructor);
});

itemSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Item = mongoose.model("Item", itemSchema);

export default Item;
