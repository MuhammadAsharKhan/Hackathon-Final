import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: [true, "Date is required"],
      unique: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name is too long"],
    },
  },
  { timestamps: true }
);

holidaySchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Holiday = mongoose.model("Holiday", holidaySchema);

export default Holiday;
