import mongoose from "mongoose";

const totalsSchema = new mongoose.Schema(
  {
    employees: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
  },
  { _id: false }
);

const payrollRunSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM"],
    },
    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    totals: {
      type: totalsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

payrollRunSchema.index({ status: 1, month: -1 });

payrollRunSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const PayrollRun = mongoose.model("PayrollRun", payrollRunSchema);

export default PayrollRun;
