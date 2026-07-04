import mongoose from "mongoose";

const STATUS_OPTIONS = ["Certa", "Errada", "Não feita", "Livre", "Substituição"];
const TREINO_OPTIONS = ["Completo", "Incompleto", "Não treinei"];
const CARDIO_OPTIONS = ["Completo", "Incompleto", "Não fiz"];
const AGUA_OPTIONS = ["Bati a meta", "Não bati"];

const dayLogSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, default: "marlon" },
    date: { type: String, required: true },
    cafe: { type: String, enum: STATUS_OPTIONS, default: null },
    cafeObs: { type: String, default: "" },
    almoco: { type: String, enum: STATUS_OPTIONS, default: null },
    almocoObs: { type: String, default: "" },
    lanche: { type: String, enum: STATUS_OPTIONS, default: null },
    lancheObs: { type: String, default: "" },
    jantar: { type: String, enum: STATUS_OPTIONS, default: null },
    jantarObs: { type: String, default: "" },
    treino: { type: String, enum: TREINO_OPTIONS, default: null },
    treinoObs: { type: String, default: "" },
    cardio: { type: String, enum: CARDIO_OPTIONS, default: null },
    cardioObs: { type: String, default: "" },
    agua: { type: String, enum: AGUA_OPTIONS, default: null },
  },
  { timestamps: true }
);

dayLogSchema.index({ user: 1, date: 1 }, { unique: true });

export const STATUS = STATUS_OPTIONS;
export const TREINO = TREINO_OPTIONS;
export const CARDIO = CARDIO_OPTIONS;
export const AGUA = AGUA_OPTIONS;
export default mongoose.model("DayLog", dayLogSchema);
