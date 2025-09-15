"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getTheme } from "./theme.js";

/**
 * PreviewIA — SEGUNDO PREVIEW (post IA)
 * Muestra:
 *  - Datos del paciente (nombre / RUT)
 *  - Exámenes sugeridos por IA
 *  - Observaciones (si existen)
 *  - Botón "Pagar ahora"
 *
 * Props:
 *  - scope: "preop" | "generales" | "ia" (define claves de sessionStorage)
 *  - datos: { nombre, rut, ... }
 *  - iaResultado?: { examenes?: string[], observaciones?: string }
 *  - onPagar?: () => void
 *  - seccionesExtra?: [{ title, lines: string[] }]
 */
export default function PreviewIA({
  scope = "preop",
  datos = {},
  iaResultado,
  onPagar,
  seccionesExtra = [],
}) {
  const T = getTheme();

  const { nombre = "", rut = "" } = datos || {};

  // Claves por scope (compat con tu app)
  const keyExams =
    scope === "generales" ? "generales_ia_examenes" : "preop_ia_examenes";
  const keyInfo =
    scope === "generales" ? "generales_ia_resumen" : "preop_ia_resumen";

  // Estado local (si no viene iaResultado por props, lo cargamos de sessionStorage)
  const [examenes, setExamenes] = useState(
    Array.isArray(iaResultado?.examenes) ? iaResultado.examenes : []
  );
  const [observaciones, setObservaciones] = useState(
    iaResultado?.observaciones || ""
  );

  useEffect(() => {
    if (iaResultado) return; // Si ya llegó por props, no leemos storage
    try {
      const r1 = sessionStorage.getItem(keyExams);
      const r2 = sessionStorage.getItem(keyInfo) || "";
      setExamenes(r1 ? JSON.parse(r1) : []);
      setObservaciones(r2 || "");
    } catch {
      setExamenes([]);
      setObservaciones("");
    }
  }, [iaResultado, keyExams, keyInfo]);

  const styles = makeStyles(T);

  return (
    <div style={styles.container}>
      <div style={styles.logo}>
        <h2 style={{ color: T.brand || T.primary, margin: 0 }}>
          Instituto de Cirugía Articular
        </h2>
      </div>

      <h3 style={styles.title}>Vista previa — Exámenes (IA)</h3>

      {/* Datos mínimos del paciente */}
      <div style={styles.info}>
        <p>
          <strong>Paciente:</strong> {nombre || "—"}
        </p>
        <p>
          <strong>RUT:</strong> {rut || "—"}
        </p>
      </div>

      {/* Exámenes sugeridos por IA */}
      <div style={styles.section}>
        <strong style={styles.sectionTitle}>Exámenes sugeridos:</strong>
        {Array.isArray(examenes) && examenes.length > 0 ? (
          <ul style={styles.ul}>
            {examenes.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : (
          <p style={{ marginTop: 6, color: T.textMuted }}>—</p>
        )}
      </div>

      {/* Observaciones IA (opcional) */}
      {observaciones ? (
        <div style={styles.noteBox}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Observaciones:</div>
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{observaciones}</p>
        </div>
      ) : null}

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

      {/* Botón de pago: solo en segundo preview */}
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

      <div style={styles.firma}>
        <hr
          style={{ width: "60%", margin: "20px auto", borderColor: T.border }}
        />
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
      fontFamily:
        T.font || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
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
    firma: {
      marginTop: 24,
    },
    textMuted: {
      color: T.textMuted,
    },
  };
                                }
