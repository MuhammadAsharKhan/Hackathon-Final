import mongoose from "mongoose";

// One document per counted name. findOneAndUpdate with $inc is the atomic
// increment, so two requests can never receive the same number.
const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  { versionKey: false }
);

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
