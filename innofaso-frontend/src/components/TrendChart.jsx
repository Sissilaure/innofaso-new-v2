import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";

function fmtDateShort(d) {
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmtDateFull(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ─────────────────────────────────────────────
// DRAW FUNCTION (pure canvas) — une courbe par point (couleur = identité du
// point), axe X proportionnel aux dates réelles, ligne de seuil pointillée,
// et repère d'alerte sur les dates où une salmonelle a été détectée.
// Renvoie la liste des points dessinés (position pixel + données) pour
// permettre le survol/info-bulle sans recalcul côté React.
// ─────────────────────────────────────────────
export function drawChart(canvas, series, seuil) {
  const wrap = canvas.parentElement;
  canvas.width  = wrap.clientWidth  * (window.devicePixelRatio || 1);
  canvas.height = wrap.clientHeight * (window.devicePixelRatio || 1);
  canvas.style.width  = "100%";
  canvas.style.height = "100%";
  const ctx = canvas.getContext("2d");
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  const cw = wrap.clientWidth, ch = wrap.clientHeight;

  const pad = { top: 22, right: 20, bottom: 32, left: 46 };
  const W = cw - pad.left - pad.right;
  const H = ch - pad.top - pad.bottom;

  ctx.clearRect(0, 0, cw, ch);

  // Fond très léger
  ctx.fillStyle = "rgba(248,250,252,0.5)";
  ctx.fillRect(pad.left, pad.top, W, H);

  const allPoints = (series || []).flatMap(s => s.points || []);
  if (allPoints.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Aucune donnée pour cette sélection", cw / 2, ch / 2);
    return [];
  }

  const allUfc = allPoints.map(p => p.ufc).filter(v => v !== null && v !== undefined);
  const rawMax = Math.max(...allUfc, seuil ?? 0, 10);
  // Ajouter 15% de marge haute pour que le seuil et les points hauts ne soient pas collés au bord
  const maxVal = rawMax * 1.15;
  const minVal = 0;

  const times = allPoints.map(p => new Date(p.date).getTime());
  const xMin = Math.min(...times);
  const xMax = Math.max(...times);
  const singleDate = xMax === xMin;

  const xPix = (t) => singleDate ? pad.left + W / 2 : pad.left + ((t - xMin) / (xMax - xMin)) * W;
  const yPix = (v) => maxVal > minVal ? pad.top + H * (1 - (v - minVal) / (maxVal - minVal)) : pad.top + H / 2;

  // Grid horizontale améliorée — 5 niveaux avec fond alterné
  [0, 0.25, 0.5, 0.75, 1].forEach((t, i) => {
    const y = pad.top + H * (1 - t);
    const val = Math.round(minVal + (maxVal - minVal) * t);

    // Ligne grille
    ctx.strokeStyle = i === 0 ? "#e2e8f0" : "#f0f4f8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + W, y);
    ctx.stroke();

    // Label Y
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Mono', 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(val, pad.left - 8, y + 3.5);
  });

  // Axe X — labels dates avec fond
  ctx.fillStyle = "#64748b";
  ctx.font = "10px 'DM Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  const nbLabels = Math.min(6, singleDate ? 1 : 6);
  for (let i = 0; i < nbLabels; i++) {
    const t = singleDate ? xMin : xMin + (i / (nbLabels - 1)) * (xMax - xMin);
    const x = xPix(t);
    const label = fmtDateShort(new Date(t));
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(label, x, pad.top + H + 22);
  }

  // Zone de dépassement du seuil — fond rouge très transparent
  if (seuil != null) {
    const sy = yPix(seuil);
    if (sy > pad.top) {
      ctx.fillStyle = "rgba(239,68,68,0.05)";
      ctx.fillRect(pad.left, pad.top, W, Math.max(0, sy - pad.top));
    }
    // Ligne seuil
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, sy);
    ctx.lineTo(pad.left + W, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    // Label seuil avec fond
    const lbl = `Seuil ${seuil}`;
    const lblW = ctx.measureText(lbl).width + 8;
    ctx.fillStyle = "rgba(254,242,242,0.9)";
    ctx.fillRect(pad.left + 4, sy - 15, lblW, 14);
    ctx.fillStyle = "#dc2626";
    ctx.font = "10px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(lbl, pad.left + 8, sy - 5);
  }

  const hitPoints = [];

  (series || []).forEach((s) => {
    const valid = (s.points || []).filter(p => p.ufc !== null && p.ufc !== undefined);
    if (valid.length === 0) return;
    const pix = valid.map(p => ({ x: xPix(new Date(p.date).getTime()), y: yPix(p.ufc), src: p }));

    if (s.dashed) ctx.globalAlpha = 0.6;

    if (pix.length > 1) {
      // Zone de remplissage sous la courbe (gradient léger)
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + H);
      grad.addColorStop(0, s.color + "30");
      grad.addColorStop(1, s.color + "00");
      ctx.beginPath();
      if (s.dashed) ctx.setLineDash([6, 4]);
      pix.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(pix[pix.length - 1].x, pad.top + H);
      ctx.lineTo(pix[0].x, pad.top + H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Ligne de la courbe
      ctx.beginPath();
      pix.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      if (s.dashed) ctx.setLineDash([]);
    }

    pix.forEach((p) => {
      // Halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = s.color + "20";
      ctx.fill();
      // Point
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      if (p.src.salmonella === true) {
        ctx.beginPath();
        ctx.arc(p.x, p.y - 14, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px 'DM Sans', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x, p.y - 10);
      }

      if (p.src.cronobacter === true) {
        ctx.beginPath();
        ctx.arc(p.x + 12, p.y - 14, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = "#7c3aed";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px 'DM Sans', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x + 12, p.y - 10);
      }

      hitPoints.push({
        x: p.x, y: p.y,
        pointId: s.pointId, label: s.label, description: s.description, color: s.color,
        ufc: p.src.ufc, date: p.src.date, salmonella: p.src.salmonella, cronobacter: p.src.cronobacter,
      });
    });

    if (s.dashed) ctx.globalAlpha = 1.0;
  });

  return hitPoints;
}

// ─────────────────────────────────────────────
// TREND CHART COMPONENT — series: [{ pointId, label, color, points: [{date, ufc, salmonella}] }]
// ─────────────────────────────────────────────
const TrendChart = forwardRef(function TrendChart({ series, seuil }, ref) {
  const canvasRef    = useRef(null);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? null,
  }));
  const wrapRef       = useRef(null);
  const hitPointsRef  = useRef([]);
  const [hover, setHover] = useState(null);

  const redraw = useCallback(() => {
    if (canvasRef.current) {
      hitPointsRef.current = drawChart(canvasRef.current, series, seuil);
    }
  }, [series, seuil]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (canvasRef.current) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [redraw]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = null, bestDist = 169; // rayon de capture ~13px
    for (const hp of hitPointsRef.current) {
      const d = (hp.x - mx) ** 2 + (hp.y - my) ** 2;
      if (d < bestDist) { bestDist = d; best = hp; }
    }
    setHover(best);
  };

  const wrapWidth = wrapRef.current?.clientWidth || 320;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", cursor: hover ? "pointer" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(hover.x, 72), wrapWidth - 72),
            top: Math.max(hover.y - 14, 0),
            transform: "translate(-50%, -100%)",
            background: "rgba(0,0,0,0.82)",
            color: "#fff",
            borderRadius: 3,
            padding: "6px 9px",
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 50,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: hover.color, display: "inline-block", flexShrink: 0 }} />
            {hover.label || hover.pointId}
          </div>
          {hover.description && (
            <div style={{ color: "#cbd5e1", marginTop: 2, whiteSpace: "normal", maxWidth: 220 }}>
              {hover.description}
            </div>
          )}
          <div style={{ color: "#c4a882", marginTop: 2 }}>{fmtDateFull(new Date(hover.date))}</div>
          <div style={{ color: "#fbbf24" }}>{hover.ufc} UFC/cm²</div>
          {hover.salmonella === true && (
            <div style={{ color: "#ff8a7a", fontWeight: 700, marginTop: 2 }}>⚠ Salmonelles détectées</div>
          )}
          {hover.cronobacter === true && (
            <div style={{ color: "#c4b5fd", fontWeight: 700, marginTop: 2 }}>⚠ Cronobacter détecté</div>
          )}
        </div>
      )}
    </div>
  );
});

export default TrendChart;
