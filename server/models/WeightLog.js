import mongoose from "mongoose";

const weightLogSchema = new mongoose.Schema(
  {
    user:   { type: String, required: true, default: "marlon" },
    date:   { type: String, required: true },
    weight: { type: Number, required: true },
  },
  { timestamps: true }
);

weightLogSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("WeightLog", weightLogSchema);
