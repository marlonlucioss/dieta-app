import { Router } from "express";
import PDFDocument from "pdfkit";
import DayLog, { STATUS, TREINO, CARDIO, AGUA } from "../models/DayLog.js";
import MedicationLog from "../models/MedicationLog.js";

const router = Router();

const MEAL_LABELS = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function weekdayLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

function getUser(req) {
  return req.query.user || req.body?.user || "marlon";
}

router.get("/status-options", (req, res) => {
  res.json(STATUS);
});

router.get("/extra-options", (req, res) => {
  res.json({ treino: TREINO, cardio: CARDIO, agua: AGUA });
});

router.get("/", async (req, res) => {
  const user = getUser(req);
  const logs = await DayLog.find({ user }).sort({ date: -1 });
  res.json(logs);
});

router.get("/report/pdf", async (req, res) => {
  const { start, end } = req.query;
  const user = getUser(req);
  if (!start || !end) {
    return res.status(400).json({ error: "Informe start e end (YYYY-MM-DD)" });
  }

  const logs = await DayLog.find({ user, date: { $gte: start, $lte: end } }).sort({ date: 1 });
  const medLogs = await MedicationLog.find({ user, date: { $gte: start, $lte: end } }).sort({
    date: 1,
    time: 1,
    medicationName: 1,
  });
  const medLogsByDate = medLogs.reduce((acc, m) => {
    (acc[m.date] = acc[m.date] || []).push(m);
    return acc;
  }, {});

  const userName = user === "marlon" ? "Marlon" : "Jéssica";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="relatorio-dieta-${userName}-${start}-a-${end}.pdf"`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text(`Relatório de Dieta — ${userName}`, { align: "center" });
  doc.fontSize(11).text(`Período: ${start} a ${end}`, { align: "center" });
  doc.moveDown(1.5);

  const allDates = Array.from(new Set([...logs.map((l) => l.date), ...Object.keys(medLogsByDate)])).sort();

  if (allDates.length === 0) {
    doc.fontSize(12).text("Nenhum registro encontrado nesse período.");
  } else {
    const counts = { Certa: 0, Errada: 0, "Não feita": 0, Livre: 0 };
    const medCounts = {};
    const logsByDate = logs.reduce((acc, l) => { acc[l.date] = l; return acc; }, {});

    allDates.forEach((date) => {
      const log = logsByDate[date];
      doc.fontSize(13).fillColor("black").text(`${date} (${weekdayLabel(date)})`, { underline: true });

      if (log) {
        Object.keys(MEAL_LABELS).forEach((meal) => {
          const status = log[meal] || "Sem registro";
          const obs = log[`${meal}Obs`];
          if (counts[status] !== undefined) counts[status] += 1;
          doc.fontSize(11).text(`  ${MEAL_LABELS[meal]}: ${status}`);
          if (obs) doc.fontSize(10).fillColor("#555").text(`    Observação: ${obs}`).fillColor("black");
        });

        if (log.treino) {
          doc.fontSize(11).fillColor("black").text(`  Treino: ${log.treino}`);
          if (log.treinoObs) doc.fontSize(10).fillColor("#555").text(`    Observação: ${log.treinoObs}`).fillColor("black");
        }
        if (log.cardio) {
          doc.fontSize(11).fillColor("black").text(`  Cardio: ${log.cardio}`);
          if (log.cardioObs) doc.fontSize(10).fillColor("#555").text(`    Observação: ${log.cardioObs}`).fillColor("black");
        }
        if (log.agua) doc.fontSize(11).fillColor("black").text(`  Água: ${log.agua}`);
      }

      const medsForDate = medLogsByDate[date] || [];
      if (medsForDate.length > 0) {
        doc.fontSize(12).fillColor("black").text("  Medicações:");
        medsForDate.forEach((m) => {
          const status = m.status || "Sem registro";
          medCounts[status] = (medCounts[status] || 0) + 1;
          doc.fontSize(11).text(`    ${m.medicationName} (${m.time}): ${status}`);
          if (m.observacao) doc.fontSize(10).fillColor("#555").text(`      Observação: ${m.observacao}`).fillColor("black");
        });
      }

      doc.moveDown(0.7);
    });

    doc.moveDown(1);
    doc.fontSize(13).text("Resumo do período - Refeições", { underline: true });
    Object.entries(counts).forEach(([status, count]) => {
      doc.fontSize(11).text(`  ${status}: ${count}`);
    });

    if (Object.keys(medCounts).length > 0) {
      doc.moveDown(1);
      doc.fontSize(13).text("Resumo do período - Medicações", { underline: true });
      Object.entries(medCounts).forEach(([status, count]) => {
        doc.fontSize(11).text(`  ${status}: ${count}`);
      });
    }
  }

  doc.end();
});

const ALLOWED_MEALS = ["cafe", "almoco", "lanche", "jantar"];
const EXTRA_FIELDS = { treino: TREINO, cardio: CARDIO, agua: AGUA };
const OBS_FIELDS = ["treino", "cardio"];

router.put("/:date/extra", async (req, res) => {
  const user = getUser(req);
  const { field, value, observacao } = req.body;
  if (!EXTRA_FIELDS[field]) return res.status(400).json({ error: "Campo inválido" });
  if (value !== undefined && value !== null && !EXTRA_FIELDS[field].includes(value))
    return res.status(400).json({ error: "Valor inválido" });

  const update = {};
  if (value !== undefined) update[field] = value;
  if (observacao !== undefined && OBS_FIELDS.includes(field)) update[`${field}Obs`] = observacao;

  const log = await DayLog.findOneAndUpdate(
    { user, date: req.params.date },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json(log);
});

router.get("/:date", async (req, res) => {
  const user = getUser(req);
  const log = await DayLog.findOne({ user, date: req.params.date });
  res.json(log || {
    user,
    date: req.params.date,
    cafe: null, cafeObs: "",
    almoco: null, almocoObs: "",
    lanche: null, lancheObs: "",
    jantar: null, jantarObs: "",
    treino: null, treinoObs: "",
    cardio: null, cardioObs: "",
    agua: null,
  });
});

router.put("/:date", async (req, res) => {
  const user = getUser(req);
  const { meal, status } = req.body;
  if (!ALLOWED_MEALS.includes(meal)) return res.status(400).json({ error: "Refeição inválida" });
  if (status !== null && !STATUS.includes(status)) return res.status(400).json({ error: "Status inválido" });

  const log = await DayLog.findOneAndUpdate(
    { user, date: req.params.date },
    { $set: { [meal]: status } },
    { new: true, upsert: true }
  );
  res.json(log);
});

router.put("/:date/observacao", async (req, res) => {
  const user = getUser(req);
  const { meal, observacao } = req.body;
  if (!ALLOWED_MEALS.includes(meal)) return res.status(400).json({ error: "Refeição inválida" });

  const log = await DayLog.findOneAndUpdate(
    { user, date: req.params.date },
    { $set: { [`${meal}Obs`]: observacao || "" } },
    { new: true, upsert: true }
  );
  res.json(log);
});

export default router;
