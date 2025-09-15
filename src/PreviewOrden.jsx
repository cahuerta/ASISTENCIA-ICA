"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getTheme } from "./theme.js";

/* === BACKEND BASE (mismo esquema que usas en otros módulos) === */
const BACKEND_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

/**
 * PreviewOrden (UNIVERSAL)
 * Props:
 *  - scope: "trauma" | "preop" | "generales" | "ia" (default "trauma")
 *  - datos: { nombre, rut, edad, genero, dolor, lado }
 *  - onContinuar?: () => void         (opcional; se llama al presionar "Continuar")
 *  - onPagar?: () => void             (opcional; si no viene, muestra alerta)
 *  - seccionesExtra?: [{ title, lines: string[] }]  (opcional; secciones a añadir)
 * 
 * Flujo:
 *   1) Render muestra botón "Continuar".
 *   2) Al continuar:
 *      - scope "trauma": fetch a /sugerir-imagenologia
 *      - "preop"/"generales"/"ia": lee IA desde sessionStorage
 *   3) Muestra preview + botón "Pagar ahora".
 */
export default function PreviewOrden({
  scope = "trauma",
  datos = {},
  onContinuar,
  onPagar,
  seccionesExtra = [],
}) {
  const T = getTheme();

  const { nombre = "", rut = "", edad = "", genero = "", dolor = "", lado = "" } = datos || {};
  const [stepStarted, setStepStarted] = useState(false);

  // Estado para TRAUMA (consulta backend)
  const [loading, setLoading] = useState(false);
  const [examLines, setExamLines] = useState([]); // líneas de examen imagenológico
  const [nota, setNota] = useState("");

  // Estado para IA (preop / generales / ia)
  const [iaExamLines, setIaExamLines] = useState([]);
  const [iaResumen, setIaResumen] = useState("");

  // Comorbilidades (para chips)
  const [comorb, setComorb] = useState(null);

  // ==== Keys por scope (coinciden con tu App.jsx) ====
  const keyExams  = scope === "generales" ? "generales_ia_examenes" : "preop_ia_examenes";
  const keyInfo   = scope === "generales" ? "generales_ia_resumen"  : "preop_ia_resumen";
  const keyComorb = scope === "generales" ? "generales_comorbilidades_data" : "preop_comorbilidades_data";

  // Normaliza chips de comorbilidades
  const chipsComorb = useMemo(() => {
    const obj = comorb;
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.map(String);
    if (typeof obj === "string") return obj.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === true) out.push(k);
      else if (typeof v === "string" && v.trim()) out.push(`${k}: ${v.trim()}`);
      else if (Array.isArray(v) && v.length) out.push(`${k}: ${v.join(", ")}`);
    }
    return out;
  }, [comorb]);

  // Título dinámico
  const titulo =
    scope === "generales"
      ? "Vista previa — Exámenes Generales"
      : scope === "preop"
      ? "Vista previa — Exámenes Prequirúrgicos"
      : scope === "ia"
      ? "Vista previa — Análisis mediante IA"
      : "Orden Médica de Examen Imagenológico";

  // Al presionar "Continuar": carga según scope
  const handleContinuar = async () => {
    setStepStarted(true);
    try {
      onContinuar?.();
    } catch {}

    if (scope === "trauma") {
      if (!dolor || !edad) {
        setExamLines([]);
        setNota("");
        return;
      }
      const controller = new AbortController();
      try {
        setLoading(true);
        const url = `${BACKEND_BASE}/sugerir-imagenologia?dolor=${encodeURIComponent(
          dolor
        )}&lado=${encodeURIComponent(lado || "")}&edad=${encodeURIComponent(edad)}`;
        const r = await fetch(url, { cache: "no-store", signal: controller.signal });
        const j = await r.json();
        if (j?.ok) {
          setExamLines(Array.isArray(j.examLines) ? j.examLines : (j.examen ? String(j.examen).split("\n") : []));
          setNota(j.nota || "");
        } else {
          setExamLines([]);
          setNota("");
        }
      } catch {
        setExamLines([]);
        setNota("");
      } finally {
        setLoading(false);
      }
      return;
    }

    // PREOP / GENERALES / IA: lee IA desde sessionStorage
    try {
      const r1 = sessionStorage.getItem(keyExams);
      const r2 = sessionStorage.getItem(keyInfo) || "";
      setIaExamLines(r1 ? JSON.parse(r1) : []);
      setIaResumen(r2 || "");
    } catch {
      setIaExamLines([]);
      setIaResumen("");
    }
    // Comorbilidades
    try {
      const rc = sessionStorage.getItem(keyComorb);
      setComorb(rc ? JSON.parse(rc) : null);
    } catch {
      setComorb(null);
    }
  };

  // Unifica secciones a mostrar
  const fullSections = useMemo(() => {
    const base = [...seccionesExtra];

    if (scope === "trauma") {
      base.unshift({
        title: "Orden médica solicitada",
        lines: loading ? ["Cargando…"] : (examLines.length ? examLines : ["—"]),
      });
    } else {
      // Inyecta exámenes IA
      base.unshift({
        title: "Exámenes solicitados (IA)",
        lines: iaExamLines.length ? iaExamLines : ["—"],
      });
    }

    return base;
  }, [scope, seccionesExtra, loading, examLines, iaExamLines]);

  // Estilos usando el tema
  const styles = makeStyles(T);

  return (
    <div style={styles.container}>
      <div style={styles.logo}>
        <h2 style={{ color: T.brand || T.primary, margin: 0 }}>Instituto de Cirugía Articular</h2>
      </div>

      <h3 style={styles.title}>{titulo}</h3>

      <div style={styles.info}>
        <p><strong>Nombre:</strong> {nombre || "—"}</p>
        <p><strong>RUT:</strong> {rut || "—"}</p>
        <p><strong>Edad:</strong> {edad ? `${edad} años` : "—"}</p>
        {genero ? <p><strong>Género:</strong> {genero}</p> : null}
        {dolor ? <p><strong>Motivo / Diagnóstico:</strong> Dolor de {dolor} {lado || ""}</p> : null}
      </div>

      {/* Paso 1: Botón Continuar */}
      {!stepStarted && (
        <button type="button" style={styles.primaryBtn} onClick={handleContinuar}>
          Continuar
        </button>
      )}

      {/* Paso 2: Preview IA / Orden */}
      {stepStarted && (
        <>
          {/* Comorbilidades (si existen) */}
          {chipsComorb.length > 0 && (
            <div style={styles.chipsWrap}>
              <div style={{ marginBottom: 6, fontWeight: 700, color: T.text }}>{`Comorbilidades:`}</div>
              <div style={styles.chips}>
                {chipsComorb.map((c, i) => (
                  <span key={i} style={styles.chip}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Secciones */}
          {fullSections.map((sec, idx) => (
            <div key={idx} style={styles.section}>
              <strong style={styles.sectionTitle}>{sec.title}</strong>
              {Array.isArray(sec.lines) && sec.lines.length > 0 ? (
                <ul style={styles.ul}>
                  {sec.lines.map((line, j) => (
                    <li key={j}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ marginTop: 6 }}>—</p>
              )}
            </div>
          ))}

          {/* Resumen IA (texto libre) */}
          {scope !== "trauma" && iaResumen ? (
            <div style={styles.noteBox}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Informe IA (resumen):</div>
              <p style={{ margin: 0, whiteSpace: "pre-line" }}>{iaResumen}</p>
            </div>
          ) : null}

          {/* Nota trauma (si aplica) */}
          {scope === "trauma" && nota ? (
            <div style={styles.noteBox}>
              <p style={{ margin: 0, whiteSpace: "pre-line" }}>{nota}</p>
            </div>
          ) : null}

          {/* Paso 3: Botón de Pago */}
          <button
            type="button"
            style={{ ...styles.primaryBtn, marginTop: 12 }}
            onClick={() => {
              if (typeof onPagar === "function") onPagar();
              else alert("Conecta el callback onPagar desde App.jsx");
            }}
          >
            Pagar ahora
          </button>
        </>
      )}

      <div style={styles.firma}>
        <hr style={{ width: "60%", margin: "20px auto", borderColor: T.border }} />
        <p style={{ textAlign: "center", margin: 0, color: T.textMuted }}>Firma médico tratante</p>
      </div>
    </div>
  );
}

/* ===================== ESTILOS CON THEME.JSON ===================== */
function makeStyles(T) {
  return {
    container: {
      border: `1.5px solid ${T.primary}`,
      borderRadius: 12,
      padding: 20,
      backgroundColor: T.surfaceAlt || "#f9fbff",
      fontFamily: T.font || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: T.text || "#002663",
      boxShadow: T.shadowSm,
    },
    logo: {
      textAlign: "center",
      marginBottom: 12,
    },
    title: {
      textAlign: "center",
      color: T.primaryDark || T.primary,
      marginBottom: 16,
      fontWeight: 800,
    },
    info: {
      fontSize: 16,
      lineHeight: 1.5,
      marginBottom: 12,
    },
    section: {
      fontSize: 16,
      backgroundColor: T.card || T.surface,
      padding: 14,
      borderRadius: 10,
      border: `1px solid ${T.border}`,
      marginTop: 10,
    },
    sectionTitle: {
      display: "block",
      color: T.primary,
      marginBottom: 6,
    },
    ul: {
      marginTop: 6,
      marginBottom: 0,
      paddingLeft: 20,
    },
    noteBox: {
      marginTop: 12,
      fontSize: 14,
      background: T.infoBg || T.accentAlpha || "#eef4ff",
      padding: 12,
      borderRadius: 8,
      whiteSpace: "pre-line",
      border: `1px solid ${T.border}`,
    },
    chipsWrap: {
      marginTop: 6,
      background: T.surface,
      border: `1px dashed ${T.border}`,
      borderRadius: 10,
      padding: 10,
    },
    chips: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      background: T.chipBg || T.accentAlpha || "rgba(0,0,0,0.05)",
      color: T.chipText || T.text,
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${T.border}`,
      fontSize: 13,
    },
    primaryBtn: {
      marginTop: 6,
      backgroundColor: T.primary,
      color: T.onPrimary,
      border: "none",
      padding: "12px",
      borderRadius: 8,
      fontSize: 16,
      cursor: "pointer",
      width: "100%",
      boxShadow: T.shadowSm,
      transition: "transform .12s ease",
    },
    firma: {
      marginTop: 24,
    },
  };
}
