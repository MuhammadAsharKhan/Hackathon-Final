import mongoose from "mongoose";
import { DEFAULT_TIMEZONE_NAME } from "../utils/dates.js";

// A single company settings document. The fixed _id is unique in the storage
// engine itself, so the first-run setup claim holds even before any index from
// this schema has been built on a fresh database.
export const SETTINGS_ID = "company";

const settingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: SETTINGS_ID,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [120, "Company name is too long"],
      default: "",
    },
    timezone: {
      type: String,
      default: DEFAULT_TIMEZONE_NAME,
    },
    officeStart: {
      type: String,
      default: "09:00",
    },
    graceMinutes: {
      type: Number,
      default: 15,
      min: [0, "Grace minutes cannot be negative"],
      max: [120, "Grace minutes is too large"],
    },
    halfDayHours: {
      type: Number,
      default: 5,
      min: [1, "Half day hours must be at least 1"],
      max: [12, "Half day hours must be at most 12"],
    },
    weekendDays: {
      type: [Number],
      default: [0, 6],
    },
    officeLat: {
      type: Number,
      default: null,
    },
    officeLng: {
      type: Number,
      default: null,
    },
    radiusMeters: {
      type: Number,
      default: 150,
      min: [10, "Radius must be at least 10 meters"],
      max: [5000, "Radius must be at most 5000 meters"],
    },
    weeklyHours: {
      type: Number,
      default: 40,
      min: [1, "Weekly hours must be at least 1"],
      max: [168, "Weekly hours must be at most 168"],
    },
    setupComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

settingsSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = String(json._id);
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
