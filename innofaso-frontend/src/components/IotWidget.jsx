import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../lib/firebase";

// Reprend les mêmes couleurs que tes KPI (var(--green), var(--orange), var(--red))
const STATUS_MAP = {
  normal:       { color: "var(--green)",  bg: "rgba(16,185,129,0.10)", label: "Normal" },
  surveillance: { color: "var(--orange)", bg: "rgba(245,158,11,0.10)", label: "Surveillance" },
  critique:     { color: "var(--red)",    bg: "rgba(239,68,68,0.10)",  label: "Critique" },
};

export default function IotWidget({ zonePath = "zones/zone1", zoneLabel = "Zone Production" }) {
  const [data, setData]           = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const zoneRef = ref(database, zonePath);
    const unsubscribe = onValue(zoneRef, (snapshot) => {
      const value = snapshot.val();
      setData(value);
      setConnected(!!value);
    }, (err) => {
      console.error("Erreur Firebase:", err);
      setConnected(false);
    });
    return () => unsubscribe();
  }, [zonePath]);

  if (!data) {
    return (
      <div className="panel iot-widget" style={{ padding: 20, textAlign: "center" }}>
        <div className="panel-header">Capteur IoT — {zoneLabel}</div>
        <p style={{ color: "var(--txt2)", fontSize: 13, marginTop: 12 }}>
          En attente des données du capteur…
        </p>
      </div>
    );
  }

  const status = STATUS_MAP[data.status] || STATUS_MAP.normal;

  return (
    <div className="panel iot-widget" style={{ padding: 20, borderTop: `3px solid ${status.color}` }}>
      <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Capteur IoT — {zoneLabel}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: connected ? "var(--green)" : "var(--txt2)",
          }} />
          <span style={{ color: connected ? "var(--green)" : "var(--txt2)", fontWeight: 600 }}>
            {connected ? "En ligne" : "Hors ligne"}
          </span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--txt)" }}>
            {data.temperature?.toFixed(1)}°C
          </div>
          <div style={{ fontSize: 11, color: "var(--txt2)", marginTop: 4 }}>Température</div>
        </div>
        <div style={{ width: 1, background: "var(--border)" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--txt)" }}>
            {data.humidity?.toFixed(0)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--txt2)", marginTop: 4 }}>Humidité</div>
        </div>
      </div>

      <div style={{
        padding: "8px 12px", borderRadius: 8, textAlign: "center",
        background: status.bg, color: status.color, fontSize: 13, fontWeight: 600,
      }}>
        {status.label}
      </div>
    </div>
  );
}