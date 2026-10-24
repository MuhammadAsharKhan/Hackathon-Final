import mongoose from "mongoose";

const snapshotSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, default: "" },
    employeeName: { type: String, default: "" },
    department: { type: String, default: "" },
    designation: { type: String, default: "" },
  },
  { _id: false }
);

const payslipSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollRun",
      default: null,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM"],
    },
    // A full snapshot, so a later salary or employee edit never changes an old
    // payslip.
    snapshot: {
      type: snapshotSchema,
      default: () => ({}),
    },
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    eligibleDays: { type: Number, default: 0 },
    perDay: { type: Number, default: 0 },
    earnedGross: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    unpaidDeduction: { type: Number, default: 0 },
    halfDayDeduction: { type: Number, default: 0 },
    attendanceDeduction: { type: Number, default: 0 },
    annualTax: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
  },
  { timestamps: true }
);

payslipSchema.index({ employeeId: 1, month: 1 }, { unique: true });
payslipSchema.index({ runId: 1 });

payslipSchema.set("toJSON", {
  transform: (document, json) => {
    json.id = json._id.toString();
    delete json._id;
    delete json.__v;
    return json;
  },
});

const Payslip = mongoose.model("Payslip", payslipSchema);

export default Payslip;
