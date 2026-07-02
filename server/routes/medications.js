import { Router } from "express";
import Medication from "../models/Medication.js";

const router = Router();

function getUser(req) {
  return req.query.user || req.body?.user || "marlon";
}

router.get("/", async (req, res) => {
  const user = getUser(req);
  const meds = await Medication.find({ user, active: true }).sort({ name: 1 });
  res.json(meds);
});

router.post("/", async (req, res) => {
  const user = getUser(req);
  const { name, times } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Nome é obrigatório" });
  const med = await Medication.create({ user, name: name.trim(), times: times || [] });
  res.status(201).json(med);
});

router.put("/:id", async (req, res) => {
  const { name, times } = req.body;
  const med = await Medication.findByIdAndUpdate(
    req.params.id,
    { $set: { ...(name ? { name: name.trim() } : {}), ...(times ? { times } : {}) } },
    { new: true }
  );
  if (!med) return res.status(404).json({ error: "Medicação não encontrada" });
  res.json(med);
});

router.delete("/:id", async (req, res) => {
  const med = await Medication.findByIdAndUpdate(req.params.id, { $set: { active: false } }, { new: true });
  if (!med) return res.status(404).json({ error: "Medicação não encontrada" });
  res.json(med);
});

export default router;
