"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getTheme } from "./theme.js";

/* === BACKEND BASE (se mantiene aunque NO se usa en este primer preview) === */
const BACKEND_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

/**
 * PreviewOrden — PRIMER PREVIEW (RESUMEN)
 * - Datos del paciente
 * - Mensaje de solicitud (Generales / Preop) usando formulario + sessionStorage
 * - Comorbilidades positivas (oculta negativas)
 * - Botón "Continuar" (el padre llama a la IA y cambia a segundo preview)
 */
export default function PreviewOrden({
  scope = "preop",           // "preop" | "generales" | (trauma/ia no se usan aquí)
  datos = {},
  onContinuar,
  seccionesExtra = [],
}) {
  const T = getTheme();

  const {
    nombre = "",
    rut = "",
    edad = "",
    genero = "",
    dolor = "",
    lado = "",
  } = datos || {};

  // === Cargar comorbilidades del scope para chips ===
  const keyComorb =
    scope === "generales"
      ? "generales_comorbilidades_data"
      : "preop_comorbilidades_data";

  const [comorb, setComorb] = useState(null);

  useEffect(() => {
    try {
      const rc = sessionStorage.getItem(keyComorb);
      setComorb(rc ? JSON.parse(rc) : null);
    } catch {
      setComorb(null);
    }
  }, [keyComorb]);

  // === SOLO POSITIVAS (oculta negativas) ===
  const chipsComorb = useMemo(() => {
    const obj = comorb;
    if (!obj) return [];

    const isAffirmative = (val) => {
      if (val === true) return true;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "number") return val === 1;
      if (typeof val === "string") {
        const s = val.trim().toLowerCase();
        if (!s) return false;
        const negativos = ["no", "negativo", "ausente", "ninguna", "ninguno", "false", "0"];
        if (negativos.includes(s)) return false;
        // Si no es claramente negativo, lo consideramos afirmativo (p.ej. "controlada")
        return true;
      }
      return false;
    };

    if (Array.isArray(obj)) return obj.filter(isAffirmative).map(String);

    const out = [];
    for (const [k, v] of Object.entries(obj)) {
      if (!isAffirmative(v)) continue;
      if (v === true) out.push(k);
      else if (typeof v === "string") out.push(`${k}: ${v.trim()}`);
      else if (Array.isArray(v)) out.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "number" && v === 1) out.push(k);
    }
    return out;
  }, [comorb]);

  // === Mensaje de solicitud por módulo ===
  const [tipoCirugia, setTipoCirugia] = useState("");

  useEffect(() => {
    if (scope !== "preop") return;
    try {
      const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
      const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      setTipoCirugia(fijo || otro || "");
    } catch {
      setTipoCirugia("");
    }
  }, [scope]);

  const solicitudMsg = useMemo(() => {
    if (scope === "generales") {
      return "Usted solicitó una evaluación con exámenes para chequeo general preventivo.";
    }
    if (scope === "preop") {
      const z = dolor ? `Zona: ${dolor}` : "";
      const l = lado ? ` ${lado}` : "";
      const cir = tipoCirugia ? ` para cirugía de ${tipoCirugia}` : "";
      const suf = (z || l) ? ` — ${z}${l}` : "";
      return `Usted solicitó evaluación preoperatoria${cir}.${suf}`;
    }
    return "";
  }, [scope, tipoCirugia, dolor, lado]);

  const titulo = "Vista previa — Resumen";
  const styles = makeStyles(T);

  return (
    <div style={styles.container}>
      <div style={styles.logo}>
        <h2 style={{ color: T.brand || T.primary, margin: 0 }}>
          Instituto de Cirugía Articular
        </h2>
      </div>

      <h3 style={styles.title}>{titulo}</h3>

      {/* MENSAJE DE SOLICITUD */}
      {solicitudMsg ? (
        <div style={styles.noticeBox}>
          <p style={{ margin: 0 }}>{solicitudMsg}</p>
        </div>
      ) : null}

      {/* Datos del paciente */}
      <div style={styles.info}>
        <p><strong>Nombre:</strong> {nombre || "—"}</p>
        <p><strong>RUT:</strong> {rut || "—"}</p>
        <p><strong>Edad:</strong> {edad ? `${edad} años` : "—"}</p>
        {genero ? <p><strong>Género:</strong> {genero}</p> : null}
        {dolor ? <p><strong>Motivo / Diagnóstico:</strong> Dolor de {dolor} {lado || ""}</p> : null}
      </div>

      {/* Comorbilidades positivas */}
      <div style={styles.chipsWrap}>
        <div style={{ marginBottom: 6, fontWeight: 700, color: T.text }}>
          Comorbilidades (positivas):
        </div>
        {chipsComorb.length > 0 ? (
          <div style={styles.chips}>
            {chipsComorb.map((c, i) => (
              <span key={i} style={styles.chip}>{c}</span>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: T.textMuted }}>
            Sin comorbilidades positivas seleccionadas.
          </p>
        )}
      </div>

      {/* Secciones extra opcionales */}
      {Array.isArray(seccionesExtra) &&
        seccionesExtra.map((sec, idx) => (
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

      {/* Botón Continuar → IA */}
      <button
        type="button"
        style={styles.primaryBtn}
        onClick={() => {
          try { onContinuar?.(); } catch {}
        }}
      >
        Continuar → Analizar con IA
      </button>

      <div style={styles.firma}>
        <hr style={{ width: "60%", margin: "20px auto", borderColor: T.border }} />
        <p style={{ textAlign: "center", margin: 0, color: T.textMuted }}>
          Firma médico tratante
        </p>
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
    logo: { textAlign: "center", marginBottom: 12 },
    title: {
      textAlign: "center",
      color: T.primaryDark || T.primary,
      marginBottom: 16,
      fontWeight: 800,
    },
    noticeBox: {
      marginBottom: 12,
      background: T.infoBg || T.accentAlpha || "#eef4ff",
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
    },
    info: { fontSize: 16, lineHeight: 1.5, marginBottom: 12 },
    section: {
      fontSize: 16,
      backgroundColor: T.card || T.surface,
      padding: 14,
      borderRadius: 10,
      border: `1px solid ${T.border}`,
      marginTop: 10,
    },
    sectionTitle: { display: "block", color: T.primary, marginBottom: 6 },
    ul: { marginTop: 6, marginBottom: 0, paddingLeft: 20 },
    chipsWrap: {
      marginTop: 10,
      background: T.surface,
      border: `1px dashed ${T.border}`,
      borderRadius: 10,
      padding: 10,
    },
    chips: { display: "flex", flexWrap: "wrap", gap: 8 },
    chip: {
      background: T.chipBg || T.accentAlpha || "rgba(0,0,0,0.05)",
      color: T.chipText || T.text,
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${T.border}`,
      fontSize: 13,
    },
    primaryBtn: {
      marginTop: 14,
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
    firma: { marginTop: 24 },
  };
            }
