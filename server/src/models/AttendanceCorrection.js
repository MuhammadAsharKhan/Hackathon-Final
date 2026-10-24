import mongoose from "mongoose";

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
    },
    requestedCheckIn: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Check-in must be HH:mm"],
    },
    requestedCheckOut: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Check-out must be HH:mm"],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, "Reason must be at least 5 characters"],
      maxlength: [300, "Reason is too long"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decisionComment: {
      type: String,
      default: "",
      trim: true,
      maxlength: [300, "Comment is too long"],
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

attendanceCorrectionSchema.index({ employeeId: 1, date: 1 });
attendanceCorrectionSchema.index({ status: 1, createdAt: -1 });

attendanceCorrectionSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const AttendanceCorrection = mongoose.model(
  "AttendanceCorrection",
  attendanceCorrectionSchema
);

export default AttendanceCorrection;
