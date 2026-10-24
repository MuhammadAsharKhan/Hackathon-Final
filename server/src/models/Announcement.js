import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title is too long"],
    },
    body: {
      type: String,
      required: [true, "Body is required"],
      trim: true,
      maxlength: [2000, "Body is too long"],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      type: String,
      default: "",
    },
    authorRole: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

announcementSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
