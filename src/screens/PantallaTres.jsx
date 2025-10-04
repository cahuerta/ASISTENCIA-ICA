// src/screens/PantallaTres.jsx
"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import "../app.css";
import { getTheme } from "../theme.js";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

/* Módulos que sí pueden usarse para otros flujos */
import PreopModulo from "../modules/PreopModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import IAModulo from "../modules/IAModulo.jsx";

/* BACKEND (igual que en tu App.jsx) */
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* Helpers locales (mismos criterios usados en el proyecto) */
function ensureTraumaIdPago() {
  let id = null;
  try { id = sessionStorage.getItem("idPago"); } catch {}
  if (!id || !/^pago_|^trauma_/.test(id)) {
    id = `trauma_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    try { sessionStorage.setItem("idPago", id); } catch {}
  }
  return id;
}

function leerSecciones(zonaKey, ladoFallback = "") {
  // 1) Preferir `${zona}_seccionesExtra` (lo dejamos desde Trauma/Mapper)
  try {
    const rawExtra = sessionStorage.getItem(`${zonaKey}_seccionesExtra`);
    if (rawExtra) {
      const arr = JSON.parse(rawExtra);
      if (Array.isArray(arr) && arr.length) {
        return arr
          .filter((sec) => Array.isArray(sec?.lines) && sec.lines.length)
          .map((sec) => ({
            title:
              sec.title ||
              `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${ladoFallback} — puntos marcados`,
            lines: sec.lines,
          }));
      }
    }
  } catch {}

  // 2) Fallback directo a `${zona}_data` (por si alguien abrió PantallaTres sin pasar antes por sync)
  try {
    const rawData = sessionStorage.getItem(`${zonaKey}_data`);
    if (rawData) {
      const d = JSON.parse(rawData);
      const lines = Array.isArray(d?.puntosSeleccionados) ? d.puntosSeleccionados : [];
      if (lines.length) {
        const lado = d?.lado || ladoFallback || "";
        return [
          {
            title: `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${lado} — puntos marcados`,
            lines,
          },
        ];
      }
    }
  } catch {}

  return [];
}

function loadMarcadoresPorZona(zonaKey, ladoTexto = "") {
  const lado = (ladoTexto || "").toLowerCase();
  const side =
    lado.includes("izquierda") ? "izquierda" : lado.includes("derecha") ? "derecha" : "";
  if (!side) return null;
  try {
    const raw = sessionStorage.getItem(`${zonaKey}_resumen_${side}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PantallaTres({
  initialDatos,
  moduloInicial,
  rmPdfListo: rmPdfListoProp,
  rmIdPago: rmIdPagoProp,
  // sólo por compat: no los usamos aquí porque esto es preview renderizada
  onPedirChecklistResonancia,
  onDetectarResonancia,
  resumenResoTexto,
}) {
  const T = getTheme();

  const cssVars = {
    "--bg": T.bg, "--surface": T.surface, "--border": T.border,
    "--text": T.text, "--text-muted": T.textMuted, "--muted": T.muted,
    "--primary": T.primary, "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
    "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm, "--shadow-md": T.shadowMd,
    "--overlay": T.overlay,
  };

  // === datos del paciente
  const datos = useMemo(() => {
    if (initialDatos) return initialDatos;
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, [initialDatos]);

  // === módulo seleccionado
  const modulo = useMemo(() => {
    if (moduloInicial) return moduloInicial;
    try {
      const m = sessionStorage.getItem("modulo");
      if (["trauma", "preop", "generales", "ia"].includes(m)) return m;
    } catch {}
    return "trauma";
  }, [moduloInicial]);

  // === estado de RM para mostrar link PDF (solo trauma/ia)
  const rmPdfListo = useMemo(() => {
    if (typeof rmPdfListoProp === "boolean") return rmPdfListoProp;
    try { return sessionStorage.getItem("rm_pdf_disponible") === "1"; } catch { return false; }
  }, [rmPdfListoProp]);

  const rmIdPago = useMemo(() => {
    if (typeof rmIdPagoProp === "string") return rmIdPagoProp;
    try { return sessionStorage.getItem("rm_idPago") || ""; } catch { return ""; }
  }, [rmIdPagoProp]);

  // === IA (Trauma) guardada en sessionStorage por el módulo previo
  const examenesIA = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("trauma_ia_examenes");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }, []);
  const diagnosticoIA = useMemo(() => {
    try { return sessionStorage.getItem("trauma_ia_diagnostico") || ""; } catch { return ""; }
  }, []);
  const justificacionIA = useMemo(() => {
    try { return sessionStorage.getItem("trauma_ia_justificacion") || ""; } catch { return ""; }
  }, []);

  // === Secciones de puntos marcados (por zona/lado)
  const seccionesMarcadores = useMemo(() => {
    const lado = datos?.lado || "";
    const zonas = ["rodilla", "mano", "hombro", "codo", "tobillo"];
    const out = [];
    for (const z of zonas) {
      const secs = leerSecciones(z, lado);
      if (secs.length) out.push(...secs);
    }
    return out;
  }, [datos?.lado]);

  // ===== Pago / Descarga (mismo comportamiento que usas en Trauma)
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  useEffect(() => {
    // Si venimos con ?pago=ok en la URL, ya lo maneja App, pero dejamos este
    // bloque en caso de que PantallaTres se cargue directo.
    try {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get("pago");
      const idPago = params.get("idPago") || sessionStorage.getItem("idPago");
      if (pago === "ok" && idPago) {
        if (pollerRef.current) clearInterval(pollerRef.current);
        let intentos = 0;
        pollerRef.current = setInterval(async () => {
          intentos++;
          try { await fetch(`${BACKEND_BASE}/obtener-datos/${idPago}`); } catch {}
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
  }, []);

  const handlePagar = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datos.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return;
    }

    try {
      const idPago = ensureTraumaIdPago();
      try {
        sessionStorage.setItem("modulo", "trauma");
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));
      } catch {}

      const lado = datos?.lado || "";
      const rodillaMarcadores = loadMarcadoresPorZona("rodilla", lado);
      const manoMarcadores = loadMarcadoresPorZona("mano", lado);
      const hombroMarcadores = loadMarcadoresPorZona("hombro", lado);
      const codoMarcadores = loadMarcadoresPorZona("codo", lado);
      const tobilloMarcadores = loadMarcadoresPorZona("tobillo", lado);

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: {
            ...datos,
            edad: edadNum,
            // IA guardada:
            examenesIA,
            diagnosticoIA,
            justificacionIA,
            // RM (si la llenaste antes):
            rmForm: null,
            rmObservaciones: "",
            // Marcadores:
            rodillaMarcadores,
            marcadores: {
              rodilla: rodillaMarcadores,
              mano: manoMarcadores,
              hombro: hombroMarcadores,
              codo: codoMarcadores,
              tobillo: tobilloMarcadores,
            },
            manoMarcadores,
            hombroMarcadores,
            codoMarcadores,
            tobilloMarcadores,
          },
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "trauma" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (trauma):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const handleDescargar = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `orden_${baseName}.pdf`;
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
          if (!reinyectado) {
            // Reinyectar datos mínimos y reintentar
            const edadNum = Number(datos.edad) || datos.edad;
            const lado = datos?.lado || "";
            const rodillaMarcadores = loadMarcadoresPorZona("rodilla", lado);
            const manoMarcadores = loadMarcadoresPorZona("mano", lado);
            const hombroMarcadores = loadMarcadoresPorZona("hombro", lado);
            const codoMarcadores = loadMarcadoresPorZona("codo", lado);
            const tobilloMarcadores = loadMarcadoresPorZona("tobillo", lado);

            await fetch(`${BACKEND_BASE}/guardar-datos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: {
                  ...datos,
                  edad: edadNum,
                  examenesIA,
                  diagnosticoIA,
                  justificacionIA,
                  rodillaMarcadores,
                  marcadores: {
                    rodilla: rodillaMarcadores,
                    mano: manoMarcadores,
                    hombro: hombroMarcadores,
                    codo: codoMarcadores,
                    tobillo: tobilloMarcadores,
                  },
                  manoMarcadores,
                  hombroMarcadores,
                  codoMarcadores,
                  tobilloMarcadores,
                },
              }),
            });

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
    pdfLinkBox: { marginTop: 8 },
    pdfLink: {
      display: "inline-block",
      fontWeight: 750,
      fontSize: 13,
      textDecoration: "none",
      background: T.surface,
      color: T.primaryDark || "#0d47a1",
      border: `2px solid ${T.primaryDark || "#0d47a1"}`,
      borderRadius: 10,
      padding: "10px 12px",
    },
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
          {/* ====== TRAUMA: PREVIEW ORDEN + PREVIEW IA + PAGO ====== */}
          {modulo === "trauma" && (
            <>
              {/* Preview Orden: puntos marcados por zona/lado */}
              <div style={styles.block}>
                <div style={styles.hblock}>Puntos marcados</div>
                {seccionesMarcadores.length ? (
                  seccionesMarcadores.map((sec, idx) => (
                    <div key={`sec-${idx}`} className="trauma-block">
                      <strong>{sec.title}</strong>
                      <ul style={styles.list}>
                        {sec.lines.map((l, i) => <li key={i}>{l}</li>)}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="trauma-hint">No hay puntos marcados.</div>
                )}
              </div>

              {/* Preview IA (diagnóstico + exámenes + justificación) */}
              <div style={styles.block}>
                <div style={styles.hblock}>Análisis IA</div>

                <div className="trauma-block">
                  <strong>Diagnóstico presuntivo:</strong>
                  <div className="trauma-mono mt-6">{diagnosticoIA || "—"}</div>
                </div>

                <div className="trauma-block">
                  <strong>Exámenes sugeridos:</strong>
                  {examenesIA.length ? (
                    <ul style={styles.list}>
                      {examenesIA.map((e, i) => <li key={`${e}-${i}`}>{e}</li>)}
                    </ul>
                  ) : (
                    <div className="trauma-hint">Aún no hay lista generada.</div>
                  )}
                </div>

                {justificacionIA && (
                  <div className="trauma-block">
                    <strong>Justificación (≈100 palabras):</strong>
                    <div className="trauma-mono mt-6">{justificacionIA}</div>
                  </div>
                )}
              </div>

              {/* Pago / Descarga */}
              <div style={styles.block}>
                <button className="trauma-btn primary" style={styles.btnPrimary} onClick={handlePagar}>
                  Pagar ahora
                </button>
                <button
                  className="trauma-btn"
                  style={{ marginLeft: 8 }}
                  onClick={handleDescargar}
                  disabled={descargando}
                  title={mensajeDescarga || "Verificar y descargar"}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>

                {rmPdfListo && !!rmIdPago && (
                  <div style={styles.pdfLinkBox}>
                    <a
                      href={`${BACKEND_BASE}/pdf-rm/${rmIdPago}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.pdfLink}
                      className="btn"
                    >
                      Formulario RM (PDF)
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ====== Otros módulos, si decides usarlos en esta pantalla ====== */}
          {modulo === "preop" && <PreopModulo initialDatos={datos} />}
          {modulo === "generales" && <GeneralesModulo initialDatos={datos} />}
          {modulo === "ia" && (
            <>
              <IAModulo initialDatos={datos} />
              {rmPdfListo && !!rmIdPago && (
                <div style={styles.pdfLinkBox}>
                  <a
                    href={`${BACKEND_BASE}/pdf-rm/${rmIdPago}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.pdfLink}
                    className="btn"
                  >
                    Formulario RM (PDF)
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
