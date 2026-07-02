import mongoose from "mongoose";

export const MEDICATION_STATUS = ["Tomei", "Não tomei"];

const medicationLogSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, default: "marlon" },
    date: { type: String, required: true },
    medicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Medication", required: true },
    medicationName: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: MEDICATION_STATUS, default: null },
    observacao: { type: String, default: "" },
  },
  { timestamps: true }
);

medicationLogSchema.index({ user: 1, date: 1, medicationId: 1, time: 1 }, { unique: true });

export default mongoose.model("MedicationLog", medicationLogSchema);
