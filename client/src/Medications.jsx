import { useEffect, useRef, useState } from "react";

const MED_STATUS_COLORS = {
  Tomei: "#2e7d32",
  "Não tomei": "#c62828",
};

export default function Medications({ date, user }) {
  const [medications, setMedications] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [savedKey, setSavedKey] = useState(null);
  const [newName, setNewName] = useState("");
  const [newTimes, setNewTimes] = useState([""]);
  const obsTimers = useRef({});
  const [obsDrafts, setObsDrafts] = useState({});
  const [panelOpen, setPanelOpen] = useState(false);

  function reloadMedications() {
    fetch(`/api/medications?user=${user}`)
      .then((r) => r.json())
      .then(setMedications);
  }

  function reloadEntries() {
    fetch(`/api/medication-logs/${date}?user=${user}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        const drafts = {};
        data.forEach((e) => {
          drafts[entryKey(e)] = e.observacao || "";
        });
        setObsDrafts(drafts);
      });
  }

  useEffect(() => {
    fetch("/api/medication-logs/status-options")
      .then((r) => r.json())
      .then(setStatusOptions);
  }, []);

  useEffect(() => {
    reloadMedications();
    reloadEntries();
  }, [date, user]);

  function entryKey(entry) {
    return `${entry.medicationId}_${entry.time}`;
  }

  async function addMedication(e) {
    e.preventDefault();
    const times = newTimes.map((t) => t.trim()).filter(Boolean);
    if (!newName.trim() || times.length === 0) return;

    await fetch(`/api/medications?user=${user}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), times, user }),
    });
    setNewName("");
    setNewTimes([""]);
    reloadMedications();
    reloadEntries();
  }

  async function removeMedication(id) {
    if (!confirm("Remover esta medicação? O histórico já registrado será mantido.")) return;
    await fetch(`/api/medications/${id}`, { method: "DELETE" });
    reloadMedications();
    reloadEntries();
  }

  async function setStatus(entry, status) {
    const newStatus = entry.status === status ? null : status;
    const res = await fetch(`/api/medication-logs/${date}?user=${user}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user,
        medicationId: entry.medicationId,
        medicationName: entry.medicationName,
        time: entry.time,
        status: newStatus,
      }),
    });
    const updated = await res.json();
    setEntries((prev) => prev.map((e) => (entryKey(e) === entryKey(entry) ? updated : e)));
    setSavedKey(entryKey(entry));
    setTimeout(() => setSavedKey((current) => (current === entryKey(entry) ? null : current)), 1500);
  }

  function handleObsChange(entry, value) {
    const key = entryKey(entry);
    setObsDrafts((prev) => ({ ...prev, [key]: value }));

    clearTimeout(obsTimers.current[key]);
    obsTimers.current[key] = setTimeout(async () => {
      const res = await fetch(`/api/medication-logs/${date}?user=${user}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          medicationId: entry.medicationId,
          medicationName: entry.medicationName,
          time: entry.time,
          observacao: value,
        }),
      });
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (entryKey(e) === key ? updated : e)));
      setSavedKey(key);
      setTimeout(() => setSavedKey((current) => (current === key ? null : current)), 1500);
    }, 800);
  }

  function updateNewTime(index, value) {
    setNewTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addTimeField() {
    setNewTimes((prev) => [...prev, ""]);
  }

  function removeTimeField(index) {
    setNewTimes((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Medicações</h2>

      <div style={{ display: "grid", gap: 16 }}>
        {entries.length === 0 && (
          <p style={{ color: "#777" }}>
            Nenhuma medicação cadastrada. Use o botão de configurações no canto inferior direito para adicionar.
          </p>
        )}
        {entries.map((entry) => {
          const key = entryKey(entry);
          return (
            <div key={key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <strong>
                {entry.medicationName} — {entry.time}
              </strong>
              {savedKey === key && <span style={{ marginLeft: 8, color: "#2e7d32", fontSize: 13 }}>Salvo!</span>}
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {statusOptions.map((status) => {
                  const selected = entry.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatus(entry, status)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: `2px solid ${MED_STATUS_COLORS[status]}`,
                        background: selected ? MED_STATUS_COLORS[status] : "white",
                        color: selected ? "white" : MED_STATUS_COLORS[status],
                        cursor: "pointer",
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
              <textarea
                placeholder="Observação (ex: motivo de não tomar, efeito colateral...)"
                value={obsDrafts[key] || ""}
                onChange={(e) => handleObsChange(entry, e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setPanelOpen(true)}
        title="Configurar medicações"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "#1565c0",
          color: "white",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          zIndex: 100,
        }}
      >
        ⚙
      </button>

      {panelOpen && (
        <>
          <div
            onClick={() => setPanelOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100%",
              width: "min(420px, 100%)",
              background: "white",
              boxShadow: "-2px 0 12px rgba(0,0,0,0.2)",
              zIndex: 201,
              padding: 24,
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Configurar medicações</h2>
              <button
                onClick={() => setPanelOpen(false)}
                style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <h3>Medicações cadastradas</h3>
            {medications.length === 0 && <p style={{ color: "#777" }}>Nenhuma medicação cadastrada.</p>}
            <ul style={{ paddingLeft: 0, listStyle: "none" }}>
              {medications.map((med) => (
                <li
                  key={med._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span>
                    <strong>{med.name}</strong> — {med.times.join(", ")}
                  </span>
                  <button
                    onClick={() => removeMedication(med._id)}
                    style={{
                      border: "1px solid #c62828",
                      color: "#c62828",
                      background: "white",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <h3>Adicionar medicação</h3>
            <form onSubmit={addMedication}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Nome da medicação"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
                {newTimes.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => updateNewTime(i, e.target.value)}
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
                    />
                    {newTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeField(i)}
                        style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer", fontSize: 18 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTimeField}
                  style={{
                    border: "1px solid #1565c0",
                    color: "#1565c0",
                    background: "white",
                    borderRadius: 6,
                    padding: "6px 10px",
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  + horário
                </button>
                <button
                  type="submit"
                  style={{
                    border: "2px solid #2e7d32",
                    background: "#2e7d32",
                    color: "white",
                    borderRadius: 6,
                    padding: "8px 14px",
                    cursor: "pointer",
                  }}
                >
                  Adicionar medicação
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
