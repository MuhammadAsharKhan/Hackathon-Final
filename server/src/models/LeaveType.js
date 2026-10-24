import mongoose from "mongoose";

const leaveTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Code is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Code must be a lowercase slug"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name is too long"],
    },
    yearlyQuota: {
      type: Number,
      default: null,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

leaveTypeSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);

export default LeaveType;
