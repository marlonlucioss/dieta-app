import { Router } from "express";
import Medication from "../models/Medication.js";
import MedicationLog, { MEDICATION_STATUS } from "../models/MedicationLog.js";

const router = Router();

function getUser(req) {
  return req.query.user || req.body?.user || "marlon";
}

router.get("/status-options", (req, res) => {
  res.json(MEDICATION_STATUS);
});

router.get("/:date", async (req, res) => {
  const user = getUser(req);
  const { date } = req.params;
  const activeMeds = await Medication.find({ user, active: true }).sort({ name: 1 });
  const existingLogs = await MedicationLog.find({ user, date });

  const entries = [];
  for (const med of activeMeds) {
    for (const time of med.times) {
      const existing = existingLogs.find(
        (l) => String(l.medicationId) === String(med._id) && l.time === time
      );
      entries.push(existing || {
        user, date,
        medicationId: med._id,
        medicationName: med.name,
        time, status: null, observacao: "",
      });
    }
  }

  entries.sort((a, b) => a.time.localeCompare(b.time));
  res.json(entries);
});

router.put("/:date", async (req, res) => {
  const user = getUser(req);
  const { medicationId, medicationName, time, status, observacao } = req.body;
  if (!medicationId || !time) return res.status(400).json({ error: "medicationId e time são obrigatórios" });
  if (status !== null && status !== undefined && !MEDICATION_STATUS.includes(status))
    return res.status(400).json({ error: "Status inválido" });

  const update = { user, medicationName, time };
  if (status !== undefined) update.status = status;
  if (observacao !== undefined) update.observacao = observacao;

  const log = await MedicationLog.findOneAndUpdate(
    { user, date: req.params.date, medicationId, time },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json(log);
});

router.get("/", async (req, res) => {
  const user = getUser(req);
  const { start, end } = req.query;
  const filter = { user, ...(start && end ? { date: { $gte: start, $lte: end } } : {}) };
  const logs = await MedicationLog.find(filter).sort({ date: 1, time: 1, medicationName: 1 });
  res.json(logs);
});

export default router;
