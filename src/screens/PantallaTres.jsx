// src/screens/PantallaTres.jsx
"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import "../app.css";
import { getTheme } from "../theme.js";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

// Ajusta estos si tu backend usa otros paths para IA
const IA_SAVE_ROUTE = "/guardar-datos-ia";
const IA_PDF_ROUTE  = "/api/pdf-ia-orden";
// (Opcional) si tienes un GET de “obtener-datos-ia”
// const IA_OBTENER_ROUTE = "/obtener-datos-ia";

function ensureIdPago(mod) {
  let id = null;
  try { id = sessionStorage.getItem("idPago"); } catch {}
  const pref = mod === "preop" ? "preop" : mod === "generales" ? "generales" : mod === "ia" ? "ia" : "trauma";
  if (!id || !id.startsWith(`${pref}_`)) {
    id = `${pref}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    try { sessionStorage.setItem("idPago", id); } catch {}
  }
  return id;
}
function getJSON(key, fallback) {
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function getTXT(key, fallback = "") {
  try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

/* === Trauma helpers (preview puntos) === */
function leerSecciones(zonaKey, ladoFallback = "") {
  try {
    const rawExtra = sessionStorage.getItem(`${zonaKey}_seccionesExtra`);
    if (rawExtra) {
      const arr = JSON.parse(rawExtra);
      if (Array.isArray(arr) && arr.length) {
        return arr
          .filter((sec) => Array.isArray(sec?.lines) && sec.lines.length)
          .map((sec) => ({
            title: sec.title || `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${ladoFallback} — puntos marcados`,
            lines: sec.lines,
          }));
      }
    }
  } catch {}
  try {
    const rawData = sessionStorage.getItem(`${zonaKey}_data`);
    if (rawData) {
      const d = JSON.parse(rawData);
      const lines = Array.isArray(d?.puntosSeleccionados) ? d.puntosSeleccionados : [];
      if (lines.length) {
        const lado = d?.lado || ladoFallback || "";
        return [{ title: `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${lado} — puntos marcados`, lines }];
      }
    }
  } catch {}
  return [];
}
function loadMarcadoresPorZona(zonaKey, ladoTexto = "") {
  const lado = (ladoTexto || "").toLowerCase();
  const side = lado.includes("izquierda") ? "izquierda" : lado.includes("derecha") ? "derecha" : "";
  if (!side) return null;
  try {
    const raw = sessionStorage.getItem(`${zonaKey}_resumen_${side}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* === Etiquetas comorbilidades (preop/generales) === */
const LABELS_COMORB = {
  hta: "Hipertensión arterial",
  dm2: "Diabetes mellitus tipo 2",
  dislipidemia: "Dislipidemia",
  obesidad: "Obesidad",
  tabaquismo: "Tabaco",
  epoc_asma: "EPOC / Asma",
  cardiopatia: "Cardiopatía",
  erc: "Enfermedad renal crónica",
  hipotiroidismo: "Hipotiroidismo",
  anticoagulantes: "Anticoagulantes/antiagregantes",
  artritis_reumatoide: "Artritis reumatoide / autoinmune",
  alergias_flag: "Alergias",
  alergias_detalle: "Alergias (detalle)",
  otras: "Otros",
  anticoagulantes_detalle: "Detalle anticoagulantes",
};
function prettyComorb(comorb = {}) {
  try {
    const keys = Object.keys(comorb);
    if (!keys.length) return [];
    const out = [];
    for (const k of keys) {
      const v = comorb[k];
      const label = LABELS_COMORB[k] || k.replace(/_/g, " ");
      if (typeof v === "boolean") { if (v) out.push(label); continue; }
      if (typeof v === "object" && v && (v.tiene || v.usa || v.detalle)) {
        let t = label;
        if (v.detalle) t += ` — ${v.detalle}`;
        out.push(t);
        continue;
      }
      if (typeof v === "string" && v.trim()) out.push(`${label}: ${v.trim()}`);
    }
    return out;
  } catch { return []; }
}

/* ======================= Componente ======================= */
export default function PantallaTres({ initialDatos, moduloInicial }) {
  const T = getTheme();
  const cssVars = {
    "--bg": T.bg, "--surface": T.surface, "--border": T.border,
    "--text": T.text, "--text-muted": T.textMuted, "--muted": T.muted,
    "--primary": T.primary, "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
    "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm, "--shadow-md": T.shadowMd,
    "--overlay": T.overlay,
  };

  /* ===== URL / módulo / idPago / pagoOk ===== */
  const [pagoOk, setPagoOk] = useState(false);
  const [idPagoState, setIdPagoState] = useState("");
  const [moduloState, setModuloState] = useState("trauma");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get("pago");
      const idPagoFromUrl = params.get("idPago") || "";
      const moduloFromUrl = (params.get("modulo") || "").toLowerCase();

      if (pago === "ok") setPagoOk(true);

      if (idPagoFromUrl) {
        setIdPagoState(idPagoFromUrl);
        try { sessionStorage.setItem("idPago", idPagoFromUrl); } catch {}
      } else {
        const s = sessionStorage.getItem("idPago") || "";
        setIdPagoState(s);
      }

      let mod =
        (moduloInicial && ["trauma","preop","generales","ia"].includes(moduloInicial) && moduloInicial) ||
        sessionStorage.getItem("modulo") ||
        (["trauma","preop","generales","ia"].includes(moduloFromUrl) ? moduloFromUrl : "");

      if (!mod) {
        const probe = idPagoFromUrl || sessionStorage.getItem("idPago") || "";
        if (probe.startsWith("preop_")) mod = "preop";
        else if (probe.startsWith("generales_")) mod = "generales";
        else if (probe.startsWith("ia_")) mod = "ia";
        else mod = "trauma";
      }

      setModuloState(mod);
      try { sessionStorage.setItem("modulo", mod); } catch {}
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduloInicial]);

  /* ===== Datos del paciente ===== */
  const datos = useMemo(() => {
    if (initialDatos) return initialDatos;
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, [initialDatos]);

  /* ====== Lecturas por módulo ====== */
  // TRAUMA IA + marcadores
  const trExamenes = useMemo(() => getJSON("trauma_ia_examenes", []), []);
  const trDx = useMemo(() => getTXT("trauma_ia_diagnostico", ""), []);
  const trJust = useMemo(() => getTXT("trauma_ia_justificacion", ""), []);
  const trSecciones = useMemo(() => {
    const lado = datos?.lado || "";
    const zonas = ["rodilla","mano","hombro","codo","tobillo"];
    const out = [];
    for (const z of zonas) {
      const secs = leerSecciones(z, lado);
      if (secs.length) out.push(...secs);
    }
    return out;
  }, [datos?.lado]);

  // PREOP
  const preopComorb = useMemo(() => getJSON("preop_comorbilidades_data", getJSON("preop_comorbilidades", {})), []);
  const preopTipo   = useMemo(() => getTXT("preop_tipoCirugia", getTXT("preop_tipo_cirugia","")), []);
  const preopExams  = useMemo(() => getJSON("preop_ia_examenes", []), []);
  const preopInf    = useMemo(() => getTXT("preop_ia_resumen",""), []);
  const preopNota   = useMemo(() => getTXT("preop_nota",""), []);

  // GENERALES
  const genComorb = useMemo(() => getJSON("generales_comorbilidades_data", {}), []);
  const genExams  = useMemo(() => getJSON("generales_ia_examenes", []), []);
  const genInf    = useMemo(() => getTXT("generales_ia_resumen",""), []);

  // IA (orden IA)
  const iaExams = useMemo(() => getJSON("ia_examenes", getJSON("trauma_ia_examenes", [])), []);
  const iaNota  = useMemo(() => getTXT("ia_nota", getTXT("trauma_ia_justificacion","")), []);

  /* ===== Polling simple tras pago ok (opcional) ===== */
  const pollerRef = useRef(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get("pago");
      const idPago = params.get("idPago") || sessionStorage.getItem("idPago");
      if (pago === "ok" && idPago) {
        const path =
          moduloState === "preop"     ? `${BACKEND_BASE}/obtener-datos-preop/${idPago}` :
          moduloState === "generales" ? `${BACKEND_BASE}/obtener-datos-generales/${idPago}` :
          moduloState === "ia"        ? `${BACKEND_BASE}${IA_PDF_ROUTE}/${idPago}` : // ping al PDF IA
                                        `${BACKEND_BASE}/obtener-datos/${idPago}`;

        if (pollerRef.current) clearInterval(pollerRef.current);
        let intentos = 0;
        pollerRef.current = setInterval(async () => {
          intentos++;
          try { await fetch(path, { cache: "no-store" }); } catch {}
          if (intentos >= 30) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        }, 2000);
      }
    } catch {}
    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [moduloState]);

  /* ===== Pago / Descarga ===== */
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function descargaBin(url, filename) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return r;
    const blob = await r.blob();
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(dlUrl);
    return r;
  }

  // TRAUMA
  const pagarTrauma = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0 || !datos.dolor?.trim()) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar."); return;
    }
    try {
      const idPago = ensureIdPago("trauma");
      sessionStorage.setItem("modulo", "trauma");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      const lado = datos?.lado || "";
      const rodilla = loadMarcadoresPorZona("rodilla", lado);
      const mano = loadMarcadoresPorZona("mano", lado);
      const hombro = loadMarcadoresPorZona("hombro", lado);
      const codo = loadMarcadoresPorZona("codo", lado);
      const tobillo = loadMarcadoresPorZona("tobillo", lado);

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: {
            ...datos,
            edad: edadNum,
            examenesIA: trExamenes,
            diagnosticoIA: trDx,
            justificacionIA: trJust,
            rodillaMarcadores: rodilla,
            marcadores: { rodilla, mano, hombro, codo, tobillo },
            manoMarcadores: mano, hombroMarcadores: hombro, codoMarcadores: codo, tobilloMarcadores: tobillo,
          },
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "trauma" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (trauma):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };
  const descargarTrauma = async () => {
    const idPago = idPagoState || sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");
    try {
      setDescargando(true); setMensajeDescarga("Verificando pago…");
      // reintentos por 402/404
      const maxIntentos = 30;
      for (let i=1;i<=maxIntentos;i++){
        const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });
        if (res.status === 200) {
          const baseName = (datos?.nombre || "paciente").replace(/ /g,"_");
          await descargaBin(`${BACKEND_BASE}/pdf/${idPago}`, `orden_${baseName}.pdf`);
          break;
        }
        if (res.status === 402) { setMensajeDescarga(`Verificando pago… (${i}/${maxIntentos})`); await sleep(1500); continue; }
        if (res.status === 404) { setMensajeDescarga("Restaurando datos…"); await sleep(500); continue; }
        alert("No se pudo descargar el PDF."); break;
      }
    } finally { setDescargando(false); setMensajeDescarga(""); }
  };

  // PREOP
  const pagarPreop = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0 || !datos.genero) {
      alert("Complete nombre, RUT, edad (>0) y género antes de pagar."); return;
    }
    try {
      const idPago = ensureIdPago("preop");
      sessionStorage.setItem("modulo", "preop");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
          comorbilidades: preopComorb,
          tipoCirugia: preopTipo,
          examenesIA: preopExams,
          informeIA: preopInf,
          nota: preopNota,
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "preop" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (preop):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };
  const descargarPreop = async () => {
    const idPago = idPagoState || sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");
    try {
      setDescargando(true); setMensajeDescarga("Verificando pago…");
      const res = await descargaBin(`${BACKEND_BASE}/pdf-preop/${idPago}`, `preop_${(datos?.nombre||"paciente").replace(/ /g,"_")}.pdf`);
      if (res?.status === 402) alert("El pago aún no se confirma.");
      else if (res && !res.ok) alert("No se pudo descargar el PDF.");
    } finally { setDescargando(false); setMensajeDescarga(""); }
  };

  // GENERALES
  const pagarGenerales = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0 || !datos.genero) {
      alert("Complete nombre, RUT, edad (>0) y género antes de pagar."); return;
    }
    try {
      const idPago = ensureIdPago("generales");
      sessionStorage.setItem("modulo", "generales");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
          comorbilidades: genComorb,
          examenesIA: genExams,
          informeIA: genInf,
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "generales" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (generales):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };
  const descargarGenerales = async () => {
    const idPago = idPagoState || sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");
    try {
      setDescargando(true); setMensajeDescarga("Verificando pago…");
      const res = await descargaBin(`${BACKEND_BASE}/pdf-generales/${idPago}`, `generales_${(datos?.nombre||"paciente").replace(/ /g,"_")}.pdf`);
      if (res?.status === 402) alert("El pago aún no se confirma.");
      else if (res && !res.ok) alert("No se pudo descargar el PDF.");
    } finally { setDescargando(false); setMensajeDescarga(""); }
  };

  // IA (orden IA)
  const pagarIA = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0) {
      alert("Complete nombre, RUT y edad (>0) antes de pagar."); return;
    }
    try {
      const idPago = ensureIdPago("ia");
      sessionStorage.setItem("modulo", "ia");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      await fetch(`${BACKEND_BASE}${IA_SAVE_ROUTE}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
          examenesIA: iaExams,
          nota: iaNota,
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "ia" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (ia):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };
  const descargarIA = async () => {
    const idPago = idPagoState || sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");
    try {
      setDescargando(true); setMensajeDescarga("Verificando pago…");
      const res = await descargaBin(`${BACKEND_BASE}${IA_PDF_ROUTE}/${idPago}`, `ordenIA_${(datos?.nombre||"paciente").replace(/ /g,"_")}.pdf`);
      if (res?.status === 402) alert("El pago aún no se confirma o el caso no está autorizado para IA.");
      else if (res && !res.ok) alert("No se pudo descargar el PDF.");
    } finally { setDescargando(false); setMensajeDescarga(""); }
  };

  /* ====================== UI ====================== */
  const styles = {
    wrap: { maxWidth: 1200, margin: "0 auto", padding: "16px" },
    header: { marginBottom: 12, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
    title: { margin: 0, fontSize: 18, fontWeight: 900, color: T.text },
    subtitle: { margin: 0, fontSize: 13, color: T.textMuted },
    card: { padding: 16 },
    block: { marginTop: 16 },
    hblock: { fontWeight: 800, marginBottom: 8, fontSize: 14 },
    list: { marginTop: 8, paddingLeft: 18 },
    btnPrimary: { marginTop: 16 },
  };

  return (
    <div className="app" style={cssVars}>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <h2 style={styles.title}>Vista previa</h2>
          {datos?.nombre && (
            <p style={styles.subtitle}>
              Paciente: <strong>{datos.nombre}</strong>
              {datos.rut ? ` — RUT: ${datos.rut}` : ""}
              {datos.edad ? ` — Edad: ${datos.edad}` : ""}
              {datos.genero ? ` — Género: ${datos.genero}` : ""}
              {datos.dolor ? ` — Zona: ${datos.dolor}${datos.lado ? ` (${datos.lado})` : ""}` : ""}
            </p>
          )}
        </div>

        <div className="card" style={styles.card}>
          {/* ===== TRAUMA ===== */}
          {moduloState === "trauma" && (
            <>
              <div style={styles.block}>
                <div style={styles.hblock}>Puntos marcados</div>
                {trSecciones.length ? (
                  trSecciones.map((sec, idx) => (
                    <div key={`sec-${idx}`} className="trauma-block">
                      <strong>{sec.title}</strong>
                      <ul style={styles.list}>{sec.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
                    </div>
                  ))
                ) : <div className="trauma-hint">No hay puntos marcados.</div>}
              </div>

              <div style={styles.block}>
                <div style={styles.hblock}>Análisis IA</div>
                <div className="trauma-block">
                  <strong>Diagnóstico presuntivo:</strong>
                  <div className="trauma-mono mt-6">{trDx || "—"}</div>
                </div>
                <div className="trauma-block">
                  <strong>Exámenes sugeridos:</strong>
                  {Array.isArray(trExamenes) && trExamenes.length ? (
                    <ul style={styles.list}>{trExamenes.map((e,i)=><li key={`${e}-${i}`}>{e}</li>)}</ul>
                  ) : <div className="trauma-hint">Aún no hay lista generada.</div>}
                </div>
                {trJust && (
                  <div className="trauma-block">
                    <strong>Justificación (≈100 palabras):</strong>
                    <div className="trauma-mono mt-6">{trJust}</div>
                  </div>
                )}
              </div>

              <div style={styles.block}>
                {!pagoOk && (
                  <button className="trauma-btn primary" style={styles.btnPrimary} onClick={pagarTrauma}>
                    Pagar ahora
                  </button>
                )}
                <button
                  className="trauma-btn"
                  style={{ marginLeft: 8 }}
                  onClick={descargarTrauma}
                  disabled={!pagoOk || descargando}
                  aria-busy={descargando}
                  title={!pagoOk ? "Completa el pago para descargar" : (mensajeDescarga || "Verificar y descargar")}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>
              </div>
            </>
          )}

          {/* ===== PREOP ===== */}
          {moduloState === "preop" && (
            <>
              <div style={styles.block}>
                <div style={styles.hblock}>Comorbilidades</div>
                {(() => {
                  const bullets = prettyComorb(preopComorb);
                  return bullets.length ? (
                    <ul style={styles.list}>{bullets.map((t,i)=><li key={i}>{t}</li>)}</ul>
                  ) : <div className="trauma-hint">—</div>;
                })()}
              </div>

              <div style={styles.block}>
                <div style={styles.hblock}>Tipo de cirugía</div>
                <div className="trauma-mono mt-6">{preopTipo || "—"}</div>
              </div>

              <div style={styles.block}>
                <div style={styles.hblock}>Exámenes solicitados (IA)</div>
                {Array.isArray(preopExams) && preopExams.length ? (
                  <ul style={styles.list}>{preopExams.map((e,i)=><li key={`${e}-${i}`}>{e}</li>)}</ul>
                ) : <div className="trauma-hint">Aún no hay lista generada.</div>}
              </div>

              {preopInf && (
                <div style={styles.block}>
                  <div style={styles.hblock}>Informe IA (resumen)</div>
                  <div className="trauma-mono mt-6">{preopInf}</div>
                </div>
              )}

              {preopNota && (
                <div style={styles.block}>
                  <div style={styles.hblock}>Notas</div>
                  <div className="trauma-mono mt-6">{preopNota}</div>
                </div>
              )}

              <div style={styles.block}>
                {!pagoOk && (
                  <button className="trauma-btn primary" style={styles.btnPrimary} onClick={pagarPreop}>
                    Pagar ahora
                  </button>
                )}
                <button
                  className="trauma-btn"
                  style={{ marginLeft: 8 }}
                  onClick={descargarPreop}
                  disabled={!pagoOk || descargando}
                  aria-busy={descargando}
                  title={!pagoOk ? "Completa el pago para descargar" : (mensajeDescarga || "Verificar y descargar")}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>
              </div>
            </>
          )}

          {/* ===== GENERALES ===== */}
          {moduloState === "generales" && (
            <>
              <div style={styles.block}>
                <div style={styles.hblock}>Comorbilidades</div>
                {(() => {
                  const bullets = prettyComorb(genComorb);
                  return bullets.length ? (
                    <ul style={styles.list}>{bullets.map((t,i)=><li key={i}>{t}</li>)}</ul>
                  ) : <div className="trauma-hint">—</div>;
                })()}
              </div>

              <div style={styles.block}>
                <div style={styles.hblock}>Exámenes solicitados (IA)</div>
                {Array.isArray(genExams) && genExams.length ? (
                  <ul style={styles.list}>{genExams.map((e,i)=><li key={`${e}-${i}`}>{e}</li>)}</ul>
                ) : <div className="trauma-hint">Aún no hay lista generada.</div>}
              </div>

              {genInf && (
                <div style={styles.block}>
                  <div style={styles.hblock}>Informe IA (resumen)</div>
                  <div className="trauma-mono mt-6">{genInf}</div>
                </div>
              )}

              <div style={styles.block}>
                {!pagoOk && (
                  <button className="trauma-btn primary" style={styles.btnPrimary} onClick={pagarGenerales}>
                    Pagar ahora
                  </button>
                )}
                <button
                  className="trauma-btn"
                  style={{ marginLeft: 8 }}
                  onClick={descargarGenerales}
                  disabled={!pagoOk || descargando}
                  aria-busy={descargando}
                  title={!pagoOk ? "Completa el pago para descargar" : (mensajeDescarga || "Verificar y descargar")}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>
              </div>
            </>
          )}

          {/* ===== IA ===== */}
          {moduloState === "ia" && (
            <>
              <div style={styles.block}>
                <div style={styles.hblock}>Orden IA — Exámenes</div>
                {Array.isArray(iaExams) && iaExams.length ? (
                  <ul style={styles.list}>{iaExams.map((e,i)=><li key={`${e}-${i}`}>{e}</li>)}</ul>
                ) : <div className="trauma-hint">—</div>}
              </div>
              {iaNota && (
                <div style={styles.block}>
                  <div style={styles.hblock}>Nota</div>
                  <div className="trauma-mono mt-6">{iaNota}</div>
                </div>
              )}
              <div style={styles.block}>
                {!pagoOk && (
                  <button className="trauma-btn primary" style={styles.btnPrimary} onClick={pagarIA}>
                    Pagar ahora
                  </button>
                )}
                <button
                  className="trauma-btn"
                  style={{ marginLeft: 8 }}
                  onClick={descargarIA}
                  disabled={!pagoOk || descargando}
                  aria-busy={descargando}
                  title={!pagoOk ? "Completa el pago para descargar" : (mensajeDescarga || "Verificar y descargar")}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
