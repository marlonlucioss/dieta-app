import { useEffect, useRef, useState } from "react";

const MED_COLORS = {
  Tomei:      { color: "#16a34a", bg: "#f0fdf4" },
  "Não tomei":{ color: "#dc2626", bg: "#fef2f2" },
};

export default function Medications({ date, user, showToast }) {
  const [medications, setMedications] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [entries, setEntries]         = useState([]);
  const [newName, setNewName]         = useState("");
  const [newTimes, setNewTimes]       = useState([""]);
  const obsTimers  = useRef({});
  const [obsDrafts, setObsDrafts]     = useState({});
  const [panelOpen, setPanelOpen]     = useState(false);

  function reloadMedications() {
    fetch(`/api/medications?user=${user}`).then((r) => r.json()).then(setMedications);
  }

  function reloadEntries() {
    fetch(`/api/medication-logs/${date}?user=${user}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        const drafts = {};
        data.forEach((e) => { drafts[entryKey(e)] = e.observacao || ""; });
        setObsDrafts(drafts);
      });
  }

  useEffect(() => {
    fetch("/api/medication-logs/status-options").then((r) => r.json()).then(setStatusOptions);
  }, []);

  useEffect(() => {
    reloadMedications();
    reloadEntries();
  }, [date, user]);

  function entryKey(e) { return `${e.medicationId}_${e.time}`; }

  async function addMedication(ev) {
    ev.preventDefault();
    const times = newTimes.map((t) => t.trim()).filter(Boolean);
    if (!newName.trim() || times.length === 0) return;
    await fetch(`/api/medications?user=${user}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), times, user }),
    });
    setNewName(""); setNewTimes([""]);
    reloadMedications(); reloadEntries();
    showToast?.("Medicação adicionada ✓");
  }

  async function removeMedication(id) {
    if (!confirm("Remover esta medicação? O histórico já registrado será mantido.")) return;
    await fetch(`/api/medications/${id}`, { method: "DELETE" });
    reloadMedications(); reloadEntries();
    showToast?.("Medicação removida");
  }

  async function setStatus(entry, status) {
    const newStatus = entry.status === status ? null : status;
    const res = await fetch(`/api/medication-logs/${date}?user=${user}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, medicationId: entry.medicationId, medicationName: entry.medicationName, time: entry.time, status: newStatus }),
    });
    const updated = await res.json();
    setEntries((prev) => prev.map((e) => (entryKey(e) === entryKey(entry) ? updated : e)));
    showToast?.("Salvo ✓");
  }

  function handleObsChange(entry, value) {
    const key = entryKey(entry);
    setObsDrafts((p) => ({ ...p, [key]: value }));
    clearTimeout(obsTimers.current[key]);
    obsTimers.current[key] = setTimeout(async () => {
      const res = await fetch(`/api/medication-logs/${date}?user=${user}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, medicationId: entry.medicationId, medicationName: entry.medicationName, time: entry.time, observacao: value }),
      });
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (entryKey(e) === key ? updated : e)));
      showToast?.("Observação salva ✓");
    }, 800);
  }

  return (
    <>
      {entries.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 16, padding: 24, textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", color: "#9ca3af",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💊</div>
          <p style={{ margin: 0, fontSize: 14 }}>
            Nenhuma medicação cadastrada.<br />
            Toque em <strong>⚙</strong> para adicionar.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((entry) => {
            const key = entryKey(entry);
            const sel = entry.status;
            const meta = sel ? MED_COLORS[sel] : null;
            return (
              <div key={key} style={{
                background: "white", borderRadius: 16, padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                borderLeft: meta ? `4px solid ${meta.color}` : "4px solid #e5e7eb",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>💊</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{entry.medicationName}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{entry.time}</div>
                  </div>
                  {sel && (
                    <span style={{
                      marginLeft: "auto", fontSize: 12, fontWeight: 600,
                      color: meta.color, background: meta.bg,
                      padding: "3px 10px", borderRadius: 100,
                    }}>
                      {sel}
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {statusOptions.map((status) => {
                    const active = entry.status === status;
                    const m = MED_COLORS[status];
                    return (
                      <button key={status} onClick={() => setStatus(entry, status)} style={{
                        padding: "10px", borderRadius: 10,
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
                  onChange={(e) => handleObsChange(entry, e.target.value)}
                  rows={2}
                  style={{
                    width: "100%", marginTop: 10, padding: "10px 12px",
                    borderRadius: 10, border: "1px solid #e5e7eb",
                    background: "#f9fafb", fontSize: 14, color: "#374151", outline: "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => setPanelOpen(true)}
        title="Configurar medicações"
        style={{
          position: "fixed", bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: "#2563eb", color: "white", fontSize: 22,
          boxShadow: "0 4px 12px rgba(37,99,235,0.4)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ⚙
      </button>

      {/* ── SIDE PANEL ── */}
      {panelOpen && (
        <>
          <div onClick={() => setPanelOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200,
          }} />
          <div style={{
            position: "fixed", top: 0, right: 0, height: "100%",
            width: "min(400px, 100%)", background: "white",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            zIndex: 201, overflowY: "auto", boxSizing: "border-box",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 20px 16px", borderBottom: "1px solid #e5e7eb",
              position: "sticky", top: 0, background: "white", zIndex: 1,
            }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Medicações</h2>
              <button onClick={() => setPanelOpen(false)} style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb",
                background: "white", color: "#374151", fontSize: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>
              {/* List */}
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Cadastradas
                </h3>
                {medications.length === 0 ? (
                  <p style={{ color: "#9ca3af", fontSize: 14 }}>Nenhuma medicação.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {medications.map((med) => (
                      <div key={med._id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: 12, background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{med.name}</div>
                          <div style={{ fontSize: 13, color: "#9ca3af" }}>{med.times.join(", ")}</div>
                        </div>
                        <button onClick={() => removeMedication(med._id)} style={{
                          padding: "6px 12px", borderRadius: 8,
                          border: "1px solid #fca5a5", background: "#fef2f2",
                          color: "#dc2626", fontWeight: 600, fontSize: 13,
                        }}>
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add form */}
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Adicionar
                </h3>
                <form onSubmit={addMedication} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Nome da medicação"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      padding: "12px", borderRadius: 10, border: "1px solid #e5e7eb",
                      background: "#f9fafb", fontSize: 15, outline: "none",
                    }}
                  />
                  {newTimes.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => setNewTimes((p) => p.map((v, j) => j === i ? e.target.value : v))}
                        style={{
                          flex: 1, padding: "12px", borderRadius: 10,
                          border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 15, outline: "none",
                        }}
                      />
                      {newTimes.length > 1 && (
                        <button type="button" onClick={() => setNewTimes((p) => p.filter((_, j) => j !== i))} style={{
                          width: 36, height: 36, borderRadius: 10, border: "1px solid #fca5a5",
                          background: "#fef2f2", color: "#dc2626", fontSize: 18,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>×</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewTimes((p) => [...p, ""])} style={{
                    padding: "10px", borderRadius: 10, border: "1px dashed #93c5fd",
                    background: "#eff6ff", color: "#2563eb", fontWeight: 600, fontSize: 14,
                  }}>
                    + Adicionar horário
                  </button>
                  <button type="submit" style={{
                    padding: "14px", borderRadius: 10, border: "none",
                    background: "#16a34a", color: "white", fontWeight: 700, fontSize: 15,
                  }}>
                    Salvar medicação
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
