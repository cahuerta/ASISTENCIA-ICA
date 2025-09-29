// src/modules/PreopModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import "./PreopModulo.css"; // ← NUEVO: estilos movidos a CSS

const T = getTheme();
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* Etiquetas amigables para chips de comorbilidades */
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

function prettyComorb(c = {}) {
  try {
    const keys = Object.keys(c);
    if (!keys.length) return [];
    const out = [];
    for (const k of keys) {
      const v = c[k];
      const label = LABELS_COMORB[k] || k.replace(/_/g, " ");
      if (typeof v === "boolean") {
        if (v) out.push(label);
        continue;
      }
      if (typeof v === "object" && v !== null && (v.tiene || v.usa || v.detalle)) {
        let t = label;
        if (v.detalle) t += ` — ${v.detalle}`;
        out.push(t);
        continue;
      }
      if (typeof v === "string" && v.trim()) {
        out.push(`${label}: ${v.trim()}`);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/* ===== Helper para el resumen inicial PREOP (sin cambiar tus variables) ===== */
function generoPalabra(genero = "") {
  const s = String(genero).toUpperCase();
  if (s === "MASCULINO") return "Hombre";
  if (s === "FEMENINO") return "Mujer";
  return "Paciente";
}
function resumenInicialPreop({ datos = {}, comorb = {}, tipoCirugia = "" }) {
  const sujeto = generoPalabra(datos.genero);
  const edad = datos.edad ? `${datos.edad} años` : "";
  const lista = prettyComorb(comorb);
  const antecedentes = lista.length
    ? `con antecedentes de: ${lista.join(", ")}`
    : "sin comorbilidades relevantes registradas";
  const cir = (tipoCirugia || "").trim() || "la cirugía indicada";
  return `${sujeto} ${edad}, ${antecedentes}. Solicita exámenes prequirúrgicos para operarse de ${cir}.`;
}

export default function PreopModulo({ initialDatos }) {
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Paso previo: "Continuar" → llama IA → segundo preview → pago/descarga
  const [stepStarted, setStepStarted] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  // Salida IA y metadatos guardados POR App.jsx
  const [examenesIA, setExamenesIA] = useState([]);
  const [informeIA, setInformeIA] = useState("");
  const [comorbilidades, setComorbilidades] = useState({});
  const [tipoCirugia, setTipoCirugia] = useState("");

  useEffect(() => {
    // Datos paciente (para mostrar)
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    // Tipo cirugía (tomado del formulario principal)
    try {
      const fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
      const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
      const final = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
      setTipoCirugia(final || "");
    } catch {}

    // Comorbilidades (MISMA CLAVE QUE USA App.jsx)
    try {
      const raw = sessionStorage.getItem("preop_comorbilidades_data");
      if (raw) {
        setComorbilidades(JSON.parse(raw));
      } else {
        // compatibilidad retro
        const idPago = sessionStorage.getItem("idPago") || "";
        const legacy = idPago ? sessionStorage.getItem(`preop_comorbilidades_${idPago}`) : null;
        if (legacy) setComorbilidades(JSON.parse(legacy));
      }
    } catch {}

    // IA (si ya existía guardada)
    try {
      const ex = JSON.parse(sessionStorage.getItem("preop_ia_examenes") || "[]");
      const inf = sessionStorage.getItem("preop_ia_resumen") || "";
      setExamenesIA(Array.isArray(ex) ? ex : []);
      setInformeIA(inf);
    } catch {}

    // Retorno de pago (marcar listo, mostrar SEGUNDO preview y hacer polling)
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      setStepStarted(true); // ← clave: quedar en segundo preview
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          // primero ruta específica, si falla, ruta genérica
          let r = await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`);
          if (!r.ok) r = await fetch(`${BACKEND_BASE}/obtener-datos/${idPago}`);
        } catch {}
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }, 2000);
    }

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, []);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ===================== Continuar → LLAMA IA y pasa al preview ===================== */
  const handleContinuar = async () => {
    try {
      setLoadingIA(true);

      // refrescos defensivos por si se editaron justo antes
      try {
        const saved = sessionStorage.getItem("datosPacienteJSON");
        if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}

      let rawComorb = {};
      try { rawComorb = JSON.parse(sessionStorage.getItem("preop_comorbilidades_data") || "{}"); } catch {}
      setComorbilidades(rawComorb || {});

      let fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
      let otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
      const cir = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
      setTipoCirugia(cir || "");

      // asegurar idPago preop
      const idPago =
        sessionStorage.getItem("idPago") ||
        `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "preop");

      const payload = {
        idPago,
        paciente: { ...datos, edad: Number(datos.edad) || datos.edad },
        comorbilidades: rawComorb || {},
        tipoCirugia: cir || "",
      };

      // endpoint principal + fallbacks
      let r = await fetch(`${BACKEND_BASE}/preop-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        r = await fetch(`${BACKEND_BASE}/ia-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();
      const ex = Array.isArray(j?.examenes) ? j.examenes : [];
      const inf = typeof j?.informeIA === "string" ? j.informeIA : "";

      // persistir para PDF/recargas
      try {
        sessionStorage.setItem("preop_ia_examenes", JSON.stringify(ex));
        sessionStorage.setItem("preop_ia_resumen", inf || "");
      } catch {}

      setExamenesIA(ex);
      setInformeIA(inf);
      setStepStarted(true);
    } catch (err) {
      console.error(err);
      alert("No fue posible obtener la información de IA (Preop). Intenta nuevamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  /* ===================== Pago ===================== */
  const handlePagarDesdePreview = async () => {
    const idPago =
      sessionStorage.getItem("idPago") ||
      `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");

    try {
      // guardamos con ruta específica y fallback genérico
      const payload = {
        idPago,
        datosPaciente: { ...datos },
        comorbilidades,
        tipoCirugia,
        examenesIA: Array.isArray(examenesIA) ? examenesIA : [],
        informeIA: informeIA || "",
      };

      let r = await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        r = await fetch(`${BACKEND_BASE}/guardar-datos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idPago, datosPaciente: { ...datos } }),
        });
      }

      await irAPagoKhipu({ ...datos }, { idPago, modulo: "preop" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (preop):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  /* ===================== Descargar PDF ===================== */
  const handleDescargarPreop = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const intentaDescarga = async () => {
      // primero pdf-preop, si no existe, /pdf/:id
      let res = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, { cache: "no-store" });
      if (!res.ok) res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });

      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `preop_${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    };

    setDescargando(true);
    setMensajeDescarga("Verificando pago…");

    let reinyectado = false;
    try {
      const maxIntentos = 30;
      for (let i = 1; i <= maxIntentos; i++) {
        const r = await intentaDescarga();
        if (r.ok) break;

        if (r.status === 402) {
          setMensajeDescarga(`Verificando pago… (${i}/${maxIntentos})`);
          await sleep(1500);
          if (i === maxIntentos) alert("El pago aún no se confirma. Intenta nuevamente.");
          continue;
        }

        if (r.status === 404) {
          // reinyectar datos mínimos (compatibilidad)
          if (!reinyectado) {
            setMensajeDescarga("Restaurando datos…");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datos;

            let r2 = await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: datosReinyectar,
                comorbilidades,
                tipoCirugia,
                examenesIA: Array.isArray(examenesIA) ? examenesIA : [],
                informeIA: informeIA || "",
              }),
            });
            if (!r2.ok) {
              await fetch(`${BACKEND_BASE}/guardar-datos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idPago, datosPaciente: datosReinyectar }),
              });
            }

            reinyectado = true;
            await sleep(500);
            continue;
          } else {
            alert("No se pudo descargar el PDF después de reintentar.");
            break;
          }
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  /* ===================== UI ===================== */
  const comorbChips = prettyComorb(comorbilidades);

  // Inyección de variables del theme → CSS vars (sin tocar la lógica)
  const cssVars = {
    "--preop-surface": T.surface,
    "--preop-border": T.border,
    "--preop-text": T.text,
    "--preop-primary": T.primary,
    "--preop-onPrimary": T.onPrimary || "#fff",
    "--preop-shadowSm": T.shadowSm || "0 1px 4px rgba(0,0,0,0.08)",
    "--preop-bg": T.bg || "#fff",
    "--preop-chipBg": T.chipBg || "#eef6ff",
    "--preop-chipBorder": T.chipBorder || "#cfe4ff",
    "--preop-chipText": T.chipText || T.primary || "#0b63c5",
    "--preop-textMuted": T.textMuted || "#667085",
  };

  return (
    <div className="preop-card" style={cssVars} aria-live="polite">
      <h3 className="preop-title">Vista previa — Exámenes preoperatorios</h3>

      <section className="preop-info">
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div><strong>Género:</strong> {datos?.genero || "—"}</div>
        <div>
          <strong>Motivo/Área:</strong>{" "}
          {`Dolor en ${(datos?.dolor || "")}${datos?.lado ? ` ${datos.lado}` : ""}`.trim() || "—"}
        </div>
        {tipoCirugia ? (
          <div><strong>Tipo de cirugía:</strong> {tipoCirugia}</div>
        ) : (
          <div className="preop-muted">
            (El tipo de cirugía se toma del formulario principal de PREOP.)
          </div>
        )}
      </section>

      {/* Resumen inicial (antes de Continuar) */}
      {!stepStarted && (
        <>
          <div className="preop-mono">
            {resumenInicialPreop({ datos, comorb: comorbilidades, tipoCirugia })}
          </div>
          <button
            className="preop-btn"
            style={{ marginTop: 10 }}
            onClick={handleContinuar}
            disabled={loadingIA}
            aria-busy={loadingIA}
          >
            {loadingIA ? "Generando con IA…" : "Continuar"}
          </button>
        </>
      )}

      {/* Después de Continuar: chips, lista IA e informe, y acciones */}
      {stepStarted && (
        <>
          {/* Comorbilidades (chips) */}
          {comorbChips.length > 0 && (
            <section style={{ marginTop: 8 }}>
              <strong>Comorbilidades:</strong>
              <div className="preop-chips">
                {comorbChips.map((t, i) => (
                  <span key={`${t}-${i}`} className="preop-chip">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* PREVIEW (lista de IA si existe) */}
          {Array.isArray(examenesIA) && examenesIA.length > 0 ? (
            <section style={{ marginTop: 12 }}>
              <strong>Exámenes a solicitar (IA):</strong>
              <ul className="preop-list">
                {examenesIA.map((e, idx) => (
                  <li key={`${e}-${idx}`}>
                    {typeof e === "string" ? e : e?.nombre || JSON.stringify(e)}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="preop-muted" style={{ marginTop: 12 }}>
              (Aún no hay lista de exámenes. Desde el formulario principal pulsa “Generar Informe”
              para que se ejecute la IA y se muestre aquí.)
            </div>
          )}

          {informeIA && (
            <section style={{ marginTop: 8 }}>
              <strong>Informe IA (resumen):</strong>
              <div className="preop-informeBox">{informeIA}</div>
            </section>
          )}

          {/* Acciones */}
          {pagoRealizado ? (
            <button
              className="preop-btn"
              style={{ marginTop: 12 }}
              onClick={handleDescargarPreop}
              disabled={descargando}
              aria-busy={descargando}
              title={mensajeDescarga || "Verificar y descargar"}
            >
              {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
            </button>
          ) : (
            <button
              className="preop-btn"
              style={{ marginTop: 12 }}
              onClick={handlePagarDesdePreview}
            >
              Pagar ahora (Pre Op)
            </button>
          )}
        </>
      )}
    </div>
  );
}
