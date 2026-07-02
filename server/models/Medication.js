import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, default: "marlon" },
    name: { type: String, required: true },
    times: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Medication", medicationSchema);
