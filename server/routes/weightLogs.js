import { Router } from "express";
import WeightLog from "../models/WeightLog.js";

const router = Router();

function getUser(req) {
  return req.query.user || req.body?.user || "marlon";
}

// Lista todos os pesos do usuário (mais recente primeiro)
router.get("/", async (req, res) => {
  const user = getUser(req);
  const logs = await WeightLog.find({ user }).sort({ date: -1 });
  res.json(logs);
});

// Busca peso de uma data específica
router.get("/:date", async (req, res) => {
  const user = getUser(req);
  const log = await WeightLog.findOne({ user, date: req.params.date });
  res.json(log || null);
});

// Registra ou atualiza peso de uma data
router.put("/:date", async (req, res) => {
  const user = getUser(req);
  const { weight } = req.body;
  if (weight === null || weight === undefined) {
    await WeightLog.deleteOne({ user, date: req.params.date });
    return res.json(null);
  }
  const log = await WeightLog.findOneAndUpdate(
    { user, date: req.params.date },
    { $set: { weight: Number(weight) } },
    { new: true, upsert: true }
  );
  res.json(log);
});

export default router;
