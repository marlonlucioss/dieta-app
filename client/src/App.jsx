import { useEffect, useRef, useState } from "react";
import Medications from "./Medications.jsx";
import { weekdayLabel } from "./weekday.js";

const MEALS = [
  { key: "cafe", label: "Café da manhã" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

const STATUS_COLORS = {
  Certa: "#2e7d32",
  Errada: "#c62828",
  "Não feita": "#757575",
  Livre: "#1565c0",
};

const USERS = [
  { id: "marlon", label: "Marlon" },
  { id: "jessica", label: "Jéssica" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [user, setUser] = useState("marlon");
  const [date, setDate] = useState(todayISO());
  const [log, setLog] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [savedMeal, setSavedMeal] = useState(null);
  const [reportStart, setReportStart] = useState(todayISO());
  const [reportEnd, setReportEnd] = useState(todayISO());
  const [obsDrafts, setObsDrafts] = useState({});
  const [savedObs, setSavedObs] = useState(null);
  const obsTimers = useRef({});
  const [extraOptions, setExtraOptions] = useState({ treino: [], cardio: [], agua: [] });
  const [savedExtra, setSavedExtra] = useState(null);
  const [extraObsDrafts, setExtraObsDrafts] = useState({ treino: "", cardio: "" });
  const extraObsTimers = useRef({});

  useEffect(() => {
    fetch("/api/day-logs/status-options").then((r) => r.json()).then(setStatusOptions);
    fetch("/api/day-logs/extra-options").then((r) => r.json()).then(setExtraOptions);
  }, []);

  useEffect(() => {
    setLog(null);
    fetch(`/api/day-logs/${date}?user=${user}`)
      .then((r) => r.json())
      .then((data) => {
        setLog(data);
        setObsDrafts({
          cafe: data.cafeObs || "",
          almoco: data.almocoObs || "",
          lanche: data.lancheObs || "",
          jantar: data.jantarObs || "",
        });
        setExtraObsDrafts({ treino: data.treinoObs || "", cardio: data.cardioObs || "" });
      });
  }, [date, user]);

  useEffect(() => {
    fetch(`/api/day-logs?user=${user}`).then((r) => r.json()).then(setHistory);
  }, [log, user]);

  async function setMealStatus(meal, status) {
    const newStatus = log[meal] === status ? null : status;
    const res = await fetch(`/api/day-logs/${date}?user=${user}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal, status: newStatus, user }),
    });
    const updated = await res.json();
    setLog(updated);
    setSavedMeal(meal);
    setTimeout(() => setSavedMeal((c) => (c === meal ? null : c)), 1500);
  }

  function handleObsChange(meal, value) {
    setObsDrafts((prev) => ({ ...prev, [meal]: value }));
    clearTimeout(obsTimers.current[meal]);
    obsTimers.current[meal] = setTimeout(async () => {
      const res = await fetch(`/api/day-logs/${date}/observacao?user=${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal, observacao: value, user }),
      });
      const updated = await res.json();
      setLog(updated);
      setSavedObs(meal);
      setTimeout(() => setSavedObs((c) => (c === meal ? null : c)), 1500);
    }, 800);
  }

  function handleExtraObsChange(field, value) {
    setExtraObsDrafts((prev) => ({ ...prev, [field]: value }));
    clearTimeout(extraObsTimers.current[field]);
    extraObsTimers.current[field] = setTimeout(async () => {
      const res = await fetch(`/api/day-logs/${date}/extra?user=${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, observacao: value, user }),
      });
      const updated = await res.json();
      setLog(updated);
      setSavedExtra(field + "_obs");
      setTimeout(() => setSavedExtra((c) => (c === field + "_obs" ? null : c)), 1500);
    }, 800);
  }

  async function setExtraField(field, value) {
    const newValue = log[field] === value ? null : value;
    const res = await fetch(`/api/day-logs/${date}/extra?user=${user}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: newValue, user }),
    });
    const updated = await res.json();
    setLog(updated);
    setSavedExtra(field);
    setTimeout(() => setSavedExtra((c) => (c === field ? null : c)), 1500);
  }

  function downloadReport() {
    window.open(`/api/day-logs/report/pdf?start=${reportStart}&end=${reportEnd}&user=${user}`, "_blank");
  }

  const activeUser = USERS.find((u) => u.id === user);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Abas de usuário */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd", background: "white", position: "sticky", top: 0, zIndex: 50 }}>
        {USERS.map((u) => (
          <button
            key={u.id}
            onClick={() => setUser(u.id)}
            style={{
              padding: "14px 32px",
              border: "none",
              borderBottom: user === u.id ? "3px solid #1565c0" : "3px solid transparent",
              background: "none",
              fontWeight: user === u.id ? "700" : "400",
              color: user === u.id ? "#1565c0" : "#555",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {u.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
        <h1 style={{ marginTop: 16 }}>Controle de Dieta — {activeUser.label}</h1>

        <label>
          Data:{" "}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />{" "}
          <span style={{ color: "#666" }}>({weekdayLabel(date)})</span>
        </label>

        {!log ? (
          <p style={{ marginTop: 24 }}>Carregando...</p>
        ) : (
          <>
            <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
              {MEALS.map(({ key, label }) => (
                <div key={key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                  <strong>{label}</strong>
                  {savedMeal === key && <span style={{ marginLeft: 8, color: "#2e7d32", fontSize: 13 }}>Salvo!</span>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {statusOptions.map((status) => {
                      const selected = log[key] === status;
                      return (
                        <button
                          key={status}
                          onClick={() => setMealStatus(key, status)}
                          style={{
                            padding: "6px 12px", borderRadius: 6,
                            border: `2px solid ${STATUS_COLORS[status]}`,
                            background: selected ? STATUS_COLORS[status] : "white",
                            color: selected ? "white" : STATUS_COLORS[status],
                            cursor: "pointer",
                          }}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    placeholder="Observação..."
                    value={obsDrafts[key] || ""}
                    onChange={(e) => handleObsChange(key, e.target.value)}
                    rows={2}
                    style={{ width: "100%", marginTop: 10, padding: 8, borderRadius: 6, border: "1px solid #ccc", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  {savedObs === key && <span style={{ color: "#2e7d32", fontSize: 12 }}>Observação salva!</span>}
                </div>
              ))}
            </div>

            {[
              { field: "treino", label: "Treino", hasObs: true, colors: { Completo: "#2e7d32", Incompleto: "#e65100", "Não treinei": "#757575" } },
              { field: "cardio", label: "Cardio", hasObs: true, colors: { Completo: "#2e7d32", Incompleto: "#e65100", "Não fiz": "#757575" } },
              { field: "agua",   label: "Meta de água", hasObs: false, colors: { "Bati a meta": "#1565c0", "Não bati": "#c62828" } },
            ].map(({ field, label, hasObs, colors }) => (
              <div key={field} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 16 }}>
                <strong>{label}</strong>
                {savedExtra === field && <span style={{ marginLeft: 8, color: "#2e7d32", fontSize: 13 }}>Salvo!</span>}
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {(extraOptions[field] || []).map((opt) => {
                    const selected = log[field] === opt;
                    const color = colors[opt] || "#555";
                    return (
                      <button
                        key={opt}
                        onClick={() => setExtraField(field, opt)}
                        style={{
                          padding: "6px 12px", borderRadius: 6,
                          border: `2px solid ${color}`,
                          background: selected ? color : "white",
                          color: selected ? "white" : color,
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {hasObs && (
                  <>
                    <textarea
                      placeholder={`Observação sobre o ${label.toLowerCase()}...`}
                      value={extraObsDrafts[field] || ""}
                      onChange={(e) => handleExtraObsChange(field, e.target.value)}
                      rows={2}
                      style={{ width: "100%", marginTop: 10, padding: 8, borderRadius: 6, border: "1px solid #ccc", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                    {savedExtra === field + "_obs" && <span style={{ color: "#2e7d32", fontSize: 12 }}>Observação salva!</span>}
                  </>
                )}
              </div>
            ))}

            <Medications date={date} user={user} />

            <div style={{ marginTop: 40, border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>Exportar relatório em PDF</h2>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label>
                  De:{" "}
                  <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />{" "}
                  <span style={{ color: "#666" }}>({weekdayLabel(reportStart)})</span>
                </label>
                <label>
                  Até:{" "}
                  <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />{" "}
                  <span style={{ color: "#666" }}>({weekdayLabel(reportEnd)})</span>
                </label>
                <button
                  onClick={downloadReport}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "2px solid #1565c0", background: "#1565c0", color: "white", cursor: "pointer" }}
                >
                  Exportar PDF
                </button>
              </div>
            </div>

            <h2 style={{ marginTop: 40 }}>Histórico</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Data</th>
                  {MEALS.map((m) => <th style={th} key={m.key}>{m.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.date}>
                    <td style={td}>
                      {h.date} <span style={{ color: "#999" }}>({weekdayLabel(h.date)})</span>
                    </td>
                    {MEALS.map((m) => (
                      <td style={{ ...td, color: STATUS_COLORS[h[m.key]] || "#999" }} key={m.key}>
                        {h[m.key] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

const th = { textAlign: "left", borderBottom: "2px solid #ddd", padding: 8 };
const td = { borderBottom: "1px solid #eee", padding: 8 };
