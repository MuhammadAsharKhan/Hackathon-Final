import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      default: "general",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [120, "Title is too long"],
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Message is too long"],
    },
    link: {
      type: String,
      default: "",
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
