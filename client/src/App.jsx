import { useEffect, useRef, useState } from "react";
import Medications from "./Medications.jsx";
import { weekdayLabel } from "./weekday.js";

const MEALS = [
  { key: "cafe",   label: "Café da manhã", emoji: "☀️" },
  { key: "almoco", label: "Almoço",        emoji: "🍽️" },
  { key: "lanche", label: "Lanche",        emoji: "🥪" },
  { key: "jantar", label: "Jantar",        emoji: "🌙" },
];

const STATUS_META = {
  Certa:        { color: "#16a34a", bg: "#f0fdf4" },
  Errada:       { color: "#dc2626", bg: "#fef2f2" },
  "Não feita":  { color: "#6b7280", bg: "#f9fafb" },
  Livre:        { color: "#2563eb", bg: "#eff6ff" },
  Substituição: { color: "#9333ea", bg: "#faf5ff" },
};

const EXTRA_META = {
  Completo:      { color: "#16a34a" },
  Incompleto:    { color: "#d97706" },
  "Não treinei": { color: "#6b7280" },
  "Não fiz":     { color: "#6b7280" },
  "Bati a meta": { color: "#2563eb" },
  "Não bati":    { color: "#dc2626" },
};

const USERS = [
  { id: "marlon",  label: "Marlon",  initials: "M" },
  { id: "jessica", label: "Jéssica", initials: "J" },
];

const HISTORY_COLORS = {
  Certa: "#16a34a", Errada: "#dc2626", "Não feita": "#9ca3af", Livre: "#2563eb", Substituição: "#9333ea",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dt.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

// ─── Pie Chart ───────────────────────────────────────────────────────────────
function PieSlice({ cx, cy, r, startAngle, endAngle, color }) {
  if (endAngle - startAngle >= 360) {
    return <circle cx={cx} cy={cy} r={r} fill={color} />;
  }
  const toRad = (deg) => (deg - 90) * (Math.PI / 180);
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return (
    <path
      d={`M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`}
      fill={color}
    />
  );
}

function PieChartSummary({ history }) {
  const STATUS_ORDER = ["Certa", "Errada", "Livre", "Substituição", "Não feita"];
  const COLORS = { Certa: "#16a34a", Errada: "#dc2626", Livre: "#2563eb", Substituição: "#9333ea", "Não feita": "#9ca3af" };

  // Conta todos os registros de refeição
  const counts = { Certa: 0, Errada: 0, Livre: 0, Substituição: 0, "Não feita": 0 };
  history.forEach((h) => {
    MEALS.forEach(({ key }) => {
      const v = h[key];
      if (v && counts[v] !== undefined) counts[v]++;
    });
  });
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const SIZE = 110;
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 4;
  let angle = 0;
  const slices = STATUS_ORDER.map((s) => {
    const deg = (counts[s] / total) * 360;
    const slice = { status: s, count: counts[s], start: angle, end: angle + deg, color: COLORS[s] };
    angle += deg;
    return slice;
  }).filter((s) => s.count > 0);

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 20,
    }}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        {slices.map((s) => (
          <PieSlice key={s.status} cx={cx} cy={cy} r={r}
            startAngle={s.start} endAngle={s.end} color={s.color} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.52} fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#6b7280">refeições</text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {slices.map((s) => {
          const pct = Math.round((s.count / total) * 100);
          return (
            <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{s.status}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{pct}%</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>({s.count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
      background: "#1f2937", color: "white", padding: "10px 20px", borderRadius: 100,
      fontSize: 14, fontWeight: 500, zIndex: 999, opacity: visible ? 1 : 0,
      transition: "opacity 0.2s, transform 0.2s", pointerEvents: "none", whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

// ─── Section tabs inside Today ────────────────────────────────────────────────
const SECTIONS = ["Dieta", "Exercícios", "Medicações"];

export default function App() {
  const [user, setUser]               = useState("marlon");
  const [date, setDate]               = useState(todayISO());
  const [log, setLog]                 = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [extraOptions, setExtraOptions]   = useState({ treino: [], cardio: [], agua: [] });
  const [history, setHistory]         = useState([]);
  const [obsDrafts, setObsDrafts]     = useState({});
  const [extraObsDrafts, setExtraObsDrafts] = useState({ treino: "", cardio: "" });
  const obsTimers     = useRef({});
  const extraObsTimers = useRef({});

  const [toast, setToast]     = useState({ msg: "", visible: false });
  const toastTimer            = useRef(null);

  const [activeTab, setActiveTab]       = useState("hoje"); // hoje | historico | relatorio
  const [activeSection, setActiveSection] = useState("Dieta");

  const [reportStart, setReportStart] = useState(todayISO());
  const [reportEnd, setReportEnd]     = useState(todayISO());

  // Peso
  const [weightLogs, setWeightLogs]   = useState([]); // [{date, weight}]
  const [weightDraft, setWeightDraft] = useState(""); // input atual
  const weightTimer = useRef(null);

  // Filtro do histórico
  const [histStart, setHistStart] = useState("");
  const [histEnd, setHistEnd]     = useState(todayISO());

  const today = todayISO();

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ msg, visible: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800);
  }

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
        setObsDrafts({ cafe: data.cafeObs||"", almoco: data.almocoObs||"", lanche: data.lancheObs||"", jantar: data.jantarObs||"" });
        setExtraObsDrafts({ treino: data.treinoObs||"", cardio: data.cardioObs||"" });
      });
    // Peso do dia atual
    fetch(`/api/weight-logs/${date}?user=${user}`)
      .then((r) => r.json())
      .then((w) => setWeightDraft(w ? String(w.weight) : ""));
  }, [date, user]);

  useEffect(() => {
    fetch(`/api/day-logs?user=${user}`).then((r) => r.json()).then(setHistory);
    fetch(`/api/weight-logs?user=${user}`).then((r) => r.json()).then((ws) => {
      setWeightLogs(ws);
      // Seta data inicial do histórico = último pesagem
      if (ws.length > 0 && !histStart) setHistStart(ws[0].date);
    });
  }, [log, user]);

  async function setMealStatus(meal, status) {
    const newStatus = log[meal] === status ? null : status;
    const res = await fetch(`/api/day-logs/${date}?user=${user}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal, status: newStatus, user }),
    });
    setLog(await res.json());
    showToast("Salvo ✓");
  }

  function handleObsChange(meal, value) {
    setObsDrafts((p) => ({ ...p, [meal]: value }));
    clearTimeout(obsTimers.current[meal]);
    obsTimers.current[meal] = setTimeout(async () => {
      const res = await fetch(`/api/day-logs/${date}/observacao?user=${user}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal, observacao: value, user }),
      });
      setLog(await res.json());
      showToast("Observação salva ✓");
    }, 800);
  }

  async function setExtraField(field, value) {
    const newValue = log[field] === value ? null : value;
    const res = await fetch(`/api/day-logs/${date}/extra?user=${user}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: newValue, user }),
    });
    setLog(await res.json());
    showToast("Salvo ✓");
  }

  function handleExtraObsChange(field, value) {
    setExtraObsDrafts((p) => ({ ...p, [field]: value }));
    clearTimeout(extraObsTimers.current[field]);
    extraObsTimers.current[field] = setTimeout(async () => {
      const res = await fetch(`/api/day-logs/${date}/extra?user=${user}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, observacao: value, user }),
      });
      setLog(await res.json());
      showToast("Observação salva ✓");
    }, 800);
  }

  function handleWeightChange(value) {
    setWeightDraft(value);
    clearTimeout(weightTimer.current);
    weightTimer.current = setTimeout(async () => {
      const num = parseFloat(value.replace(",", "."));
      if (value === "") {
        await fetch(`/api/weight-logs/${date}?user=${user}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight: null, user }),
        });
      } else if (!isNaN(num) && num > 0) {
        await fetch(`/api/weight-logs/${date}?user=${user}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight: num, user }),
        });
        setWeightLogs((prev) => {
          const others = prev.filter((w) => w.date !== date);
          return [{ date, weight: num }, ...others].sort((a, b) => b.date.localeCompare(a.date));
        });
        showToast("Peso salvo ✓");
      }
    }, 800);
  }

  function downloadReport() {
    window.open(`/api/day-logs/report/pdf?start=${reportStart}&end=${reportEnd}&user=${user}`, "_blank");
  }

  const activeUser = USERS.find((u) => u.id === user);
  const isToday = date === today;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f0f4f8" }}>
      <Toast message={toast.msg} visible={toast.visible} />

      {/* ── TOP HEADER ── */}
      <header style={{
        background: "white", borderBottom: "1px solid #e5e7eb",
        padding: "0 16px", flexShrink: 0,
        display: "flex", flexDirection: "column", gap: 0,
      }}>
        {/* User row */}
        <div style={{ display: "flex", gap: 8, paddingTop: 12, paddingBottom: 8 }}>
          {USERS.map((u) => {
            const active = u.id === user;
            return (
              <button key={u.id} onClick={() => setUser(u.id)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
                background: active ? "#2563eb" : "#f1f5f9",
                color: active ? "white" : "#6b7280",
                fontWeight: active ? 700 : 500, fontSize: 15,
                transition: "all 0.15s",
              }}>
                {u.label}
              </button>
            );
          })}
        </div>

        {/* Date navigation row (only for "hoje" tab) */}
        {activeTab === "hoje" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
            <button onClick={() => setDate(addDays(date, -1))} style={navBtn}>‹</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                {isToday ? "Hoje" : formatDate(date)}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", textTransform: "capitalize" }}>
                {isToday ? `${weekdayLabel(date)}, ${formatDate(date)}` : weekdayLabel(date)}
              </div>
            </div>
            <button onClick={() => setDate(addDays(date, 1))} style={navBtn}>›</button>
            {!isToday && (
              <button onClick={() => setDate(today)} style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid #2563eb",
                background: "#eff6ff", color: "#2563eb", fontWeight: 600, fontSize: 13,
              }}>
                Hoje
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── SCROLLABLE CONTENT ── */}
      <main style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

        {/* ══ TODAY VIEW ══ */}
        {activeTab === "hoje" && (
          <>
            {/* Section tabs */}
            <div style={{
              display: "flex", gap: 0, padding: "12px 16px 0",
              position: "sticky", top: 0, background: "#f0f4f8", zIndex: 10,
            }}>
              {SECTIONS.map((s) => {
                const active = s === activeSection;
                return (
                  <button key={s} onClick={() => setActiveSection(s)} style={{
                    flex: 1, padding: "9px 4px", border: "none",
                    borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                    background: "none", color: active ? "#2563eb" : "#6b7280",
                    fontWeight: active ? 700 : 500, fontSize: 14,
                  }}>
                    {s}
                  </button>
                );
              })}
            </div>

            {!log ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                Carregando...
              </div>
            ) : (
              <div style={{ padding: "12px 16px 24px" }}>

                {/* ── DIETA ── */}
                {activeSection === "Dieta" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {MEALS.map(({ key, label, emoji }) => {
                      const selected = log[key];
                      const meta = selected ? STATUS_META[selected] : null;
                      return (
                        <div key={key} style={{
                          background: "white", borderRadius: 16, padding: 16,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          borderLeft: meta ? `4px solid ${meta.color}` : "4px solid #e5e7eb",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 20 }}>{emoji}</span>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
                            {selected && (
                              <span style={{
                                marginLeft: "auto", fontSize: 12, fontWeight: 600,
                                color: meta.color, background: meta.bg,
                                padding: "3px 10px", borderRadius: 100,
                              }}>
                                {selected}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {statusOptions.map((status) => {
                              const active = log[key] === status;
                              const m = STATUS_META[status];
                              return (
                                <button key={status} onClick={() => setMealStatus(key, status)} style={{
                                  padding: "10px 8px", borderRadius: 10,
                                  border: `2px solid ${active ? m.color : "#e5e7eb"}`,
                                  background: active ? m.color : "white",
                                  color: active ? "white" : "#374151",
                                  fontWeight: active ? 700 : 500, fontSize: 14,
                                  transition: "all 0.15s",
                                }}>
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
                            style={{
                              width: "100%", marginTop: 10, padding: "10px 12px",
                              borderRadius: 10, border: "1px solid #e5e7eb",
                              background: "#f9fafb", fontSize: 14, color: "#374151",
                              outline: "none",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── EXERCÍCIOS ── */}
                {activeSection === "Exercícios" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { field: "treino", label: "Treino", emoji: "💪", hasObs: true },
                      { field: "cardio", label: "Cardio", emoji: "🏃", hasObs: true },
                      { field: "agua",   label: "Meta de água", emoji: "💧", hasObs: false },
                    ].map(({ field, label, emoji, hasObs }) => {
                      const selected = log[field];
                      const meta = selected ? EXTRA_META[selected] : null;
                      return (
                        <div key={field} style={{
                          background: "white", borderRadius: 16, padding: 16,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          borderLeft: meta ? `4px solid ${meta.color}` : "4px solid #e5e7eb",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 20 }}>{emoji}</span>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
                            {selected && (
                              <span style={{
                                marginLeft: "auto", fontSize: 12, fontWeight: 600,
                                color: meta.color, background: meta.color + "18",
                                padding: "3px 10px", borderRadius: 100,
                              }}>
                                {selected}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {(extraOptions[field] || []).map((opt) => {
                              const active = log[field] === opt;
                              const m = EXTRA_META[opt] || { color: "#6b7280" };
                              return (
                                <button key={opt} onClick={() => setExtraField(field, opt)} style={{
                                  padding: "12px 16px", borderRadius: 10, textAlign: "left",
                                  border: `2px solid ${active ? m.color : "#e5e7eb"}`,
                                  background: active ? m.color : "white",
                                  color: active ? "white" : "#374151",
                                  fontWeight: active ? 700 : 500, fontSize: 15,
                                  transition: "all 0.15s",
                                }}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {hasObs && (
                            <textarea
                              placeholder={`Observação sobre o ${label.toLowerCase()}...`}
                              value={extraObsDrafts[field] || ""}
                              onChange={(e) => handleExtraObsChange(field, e.target.value)}
                              rows={2}
                              style={{
                                width: "100%", marginTop: 10, padding: "10px 12px",
                                borderRadius: 10, border: "1px solid #e5e7eb",
                                background: "#f9fafb", fontSize: 14, color: "#374151",
                                outline: "none",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── PESO (dentro de Exercícios) ── */}
                {activeSection === "Exercícios" && (
                  <div style={{
                    background: "white", borderRadius: 16, padding: 16,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    borderLeft: weightDraft ? "4px solid #0891b2" : "4px solid #e5e7eb",
                    marginTop: 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>⚖️</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Peso</span>
                      {weightDraft && (
                        <span style={{
                          marginLeft: "auto", fontSize: 12, fontWeight: 600,
                          color: "#0891b2", background: "#ecfeff",
                          padding: "3px 10px", borderRadius: 100,
                        }}>
                          {weightDraft} kg
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Ex: 82.5"
                        value={weightDraft}
                        onChange={(e) => handleWeightChange(e.target.value)}
                        style={{
                          flex: 1, padding: "12px", borderRadius: 10,
                          border: "1px solid #e5e7eb", background: "#f9fafb",
                          fontSize: 18, fontWeight: 600, color: "#111827", outline: "none",
                          textAlign: "center",
                        }}
                      />
                      <span style={{ fontSize: 16, color: "#6b7280", fontWeight: 600 }}>kg</span>
                    </div>
                    {weightLogs.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "#9ca3af" }}>
                        Último registro: {weightLogs[0].weight} kg em {formatDate(weightLogs[0].date)}
                      </div>
                    )}
                  </div>
                )}

                {/* ── MEDICAÇÕES ── */}
                {activeSection === "Medicações" && (
                  <Medications date={date} user={user} showToast={showToast} />
                )}
              </div>
            )}
          </>
        )}

        {/* ══ HISTORY VIEW ══ */}
        {activeTab === "historico" && (() => {
          const weightByDate = Object.fromEntries(weightLogs.map((w) => [w.date, w.weight]));
          const filtered = history.filter((h) => {
            if (histStart && h.date < histStart) return false;
            if (histEnd   && h.date > histEnd)   return false;
            return true;
          });
          return (
            <div style={{ padding: "16px" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#111827" }}>
                Histórico — {activeUser.label}
              </h2>

              {/* Filtro de datas */}
              <div style={{
                background: "white", borderRadius: 14, padding: "12px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 14,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Filtrar período
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>De</div>
                    <input type="date" value={histStart} onChange={(e) => setHistStart(e.target.value)} style={dateInput} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Até</div>
                    <input type="date" value={histEnd} onChange={(e) => setHistEnd(e.target.value)} style={dateInput} />
                  </div>
                  {(histStart || histEnd !== todayISO()) && (
                    <button onClick={() => { setHistStart(weightLogs[0]?.date || ""); setHistEnd(todayISO()); }} style={{
                      marginTop: 18, padding: "8px 10px", borderRadius: 8,
                      border: "1px solid #e5e7eb", background: "#f9fafb",
                      color: "#6b7280", fontSize: 12, whiteSpace: "nowrap",
                    }}>
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", paddingTop: 40 }}>
                  Nenhum registro neste período.
                </div>
              ) : (
                <>
                  <PieChartSummary history={filtered} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                    {filtered.map((h) => {
                      const peso = weightByDate[h.date];
                      return (
                        <div
                          key={h.date}
                          onClick={() => { setDate(h.date); setActiveTab("hoje"); }}
                          style={{
                            background: "white", borderRadius: 14, padding: "14px 16px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer",
                            display: "flex", flexDirection: "column", gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{formatDate(h.date)}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {peso && (
                                <span style={{
                                  fontSize: 12, fontWeight: 700, color: "#0891b2",
                                  background: "#ecfeff", padding: "2px 8px", borderRadius: 100,
                                }}>
                                  ⚖️ {peso} kg
                                </span>
                              )}
                              <span style={{ fontSize: 13, color: "#9ca3af", textTransform: "capitalize" }}>
                                {weekdayLabel(h.date)}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {MEALS.map((m) => (
                              <span key={m.key} style={{
                                fontSize: 12, padding: "3px 9px", borderRadius: 100, fontWeight: 600,
                                color: h[m.key] ? HISTORY_COLORS[h[m.key]] : "#d1d5db",
                                background: h[m.key] ? HISTORY_COLORS[h[m.key]] + "18" : "#f3f4f6",
                              }}>
                                {m.emoji} {h[m.key] || "—"}
                              </span>
                            ))}
                          </div>
                          {(h.treino || h.cardio || h.agua) && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {h.treino && <span style={pillGray}>💪 {h.treino}</span>}
                              {h.cardio && <span style={pillGray}>🏃 {h.cardio}</span>}
                              {h.agua   && <span style={pillGray}>💧 {h.agua}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ══ REPORT VIEW ══ */}
        {activeTab === "relatorio" && (
          <div style={{ padding: 16 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>
              Relatório em PDF
            </h2>
            <div style={{
              background: "white", borderRadius: 16, padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>
                  Data inicial
                </label>
                <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} style={dateInput} />
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, textTransform: "capitalize" }}>
                  {weekdayLabel(reportStart)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>
                  Data final
                </label>
                <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} style={dateInput} />
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, textTransform: "capitalize" }}>
                  {weekdayLabel(reportEnd)}
                </div>
              </div>
              <button onClick={downloadReport} style={{
                padding: "14px", borderRadius: 12, border: "none",
                background: "#2563eb", color: "white",
                fontWeight: 700, fontSize: 16,
              }}>
                📄 Exportar PDF — {activeUser.label}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        background: "white", borderTop: "1px solid #e5e7eb",
        display: "flex", flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {[
          { id: "hoje",      label: "Hoje",      icon: "🏠" },
          { id: "historico", label: "Histórico",  icon: "📅" },
          { id: "relatorio", label: "Relatório",  icon: "📄" },
        ].map(({ id, label, icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, padding: "10px 0", border: "none", background: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: active ? "#2563eb" : "#9ca3af",
            }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const navBtn = {
  width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb",
  background: "white", color: "#374151", fontSize: 20, lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center",
};

const dateInput = {
  width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #e5e7eb",
  background: "#f9fafb", fontSize: 16, color: "#111827", outline: "none",
};

const pillGray = {
  fontSize: 12, padding: "3px 9px", borderRadius: 100, fontWeight: 500,
  color: "#6b7280", background: "#f3f4f6",
};
