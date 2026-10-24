import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveTypeCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    startDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"],
    },
    endDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"],
    },
    days: {
      type: Number,
      required: true,
      min: [1, "A leave request needs at least one working day"],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, "Reason is too long"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
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

leaveRequestSchema.index({ employeeId: 1, startDate: 1 });
leaveRequestSchema.index({ status: 1, startDate: 1 });

leaveRequestSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
