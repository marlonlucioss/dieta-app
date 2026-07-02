import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import dayLogsRouter from "./routes/dayLogs.js";
import medicationsRouter from "./routes/medications.js";
import medicationLogsRouter from "./routes/medicationLogs.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/day-logs", dayLogsRouter);
app.use("/api/medications", medicationsRouter);
app.use("/api/medication-logs", medicationLogsRouter);

// Serve frontend em produção
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Conectado ao MongoDB Atlas");
    app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  });
