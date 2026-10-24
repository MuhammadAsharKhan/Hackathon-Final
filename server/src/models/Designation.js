import mongoose from "mongoose";

const designationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name is too long"],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
  },
  { timestamps: true }
);

designationSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

designationSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Designation = mongoose.model("Designation", designationSchema);

export default Designation;
