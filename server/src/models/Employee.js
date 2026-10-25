import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Employee code is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name is too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone is too long"],
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address is too long"],
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null,
    },
    dateOfBirth: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    joinDate: {
      type: String,
      required: [true, "Join date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Join date must be YYYY-MM-DD"],
    },
    exitDate: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Exit date must be YYYY-MM-DD"],
    },
    status: {
      type: String,
      enum: ["probation", "active", "exited"],
      default: "active",
    },
    basicSalary: {
      type: Number,
      required: [true, "Basic salary is required"],
      min: [0, "Basic salary cannot be negative"],
    },
    hraPercent: {
      type: Number,
      default: 40,
    },
    medicalPercent: {
      type: Number,
      default: 10,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    faceDescriptor: {
      type: [Number],
      select: false,
      default: undefined,
    },
    faceEnrolledAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

employeeSchema.index({ departmentId: 1, status: 1 });

// Names for lists and 360 views; the ids stay for filtering.
employeeSchema.methods.toSummary = function toSummary() {
  return {
    id: this.id,
    code: this.code,
    name: this.name,
    email: this.email,
    joinDate: this.joinDate,
    status: this.status,
  };
};

employeeSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    delete json.faceDescriptor;
    return json;
  },
});

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
