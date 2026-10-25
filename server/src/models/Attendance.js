import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    distanceMeters: { type: Number, default: null },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
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
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: ["web", "camera", "correction"],
      default: "web",
    },
    // Stored when the record is written, so a later settings change never
    // rewrites history.
    status: {
      type: String,
      enum: ["present", "late", "half_day"],
      required: true,
    },
    workedMinutes: {
      type: Number,
      default: 0,
    },
    location: {
      type: locationSchema,
      default: null,
    },
    faceCount: {
      type: Number,
      default: null,
    },
    faceMatch: {
      type: {
        distance: { type: Number, default: null },
        matched: { type: Boolean, default: null },
      },
      default: null,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

attendanceSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
