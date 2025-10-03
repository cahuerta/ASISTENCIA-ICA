// src/screens/PantallaTres.jsx
"use client";
import React from "react";
import "../app.css";
import { getTheme } from "../theme.js";

/* Módulos (misma firma que usas hoy) */
import TraumaModulo from "../modules/TraumaModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import IAModulo from "../modules/IAModulo.jsx";

/* BACKEND (igual que en tu App.jsx) */
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/**
 * Props admitidas (todas opcionales para no romper nada):
 * - initialDatos: objeto con datos del paciente (si no, se lee de sessionStorage).
 * - moduloInicial: "trauma" | "preop" | "generales" | "ia" (si no, se lee de sessionStorage o "trauma").
 * - rmPdfListo, rmIdPago: si no vienen, se leen de sessionStorage.
 * - onPedirChecklistResonancia, onDetectarResonancia, resumenResoTexto: se pasan a Trauma/IAModulo cuando corresponda.
 */
export default function PantallaTres({
  initialDatos,
  moduloInicial,
  rmPdfListo: rmPdfListoProp,
  rmIdPago: rmIdPagoProp,
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

  // === datos del paciente (no se repite formulario)
  const datos = initialDatos || (() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();

  // === módulo seleccionado
  const modulo = (() => {
    if (moduloInicial) return moduloInicial;
    try {
      const m = sessionStorage.getItem("modulo");
      if (["trauma", "preop", "generales", "ia"].includes(m)) return m;
    } catch {}
    return "trauma";
  })();

  // === estado de RM para mostrar link PDF (solo trauma/ia)
  const rmPdfListo = (() => {
    if (typeof rmPdfListoProp === "boolean") return rmPdfListoProp;
    try { return sessionStorage.getItem("rm_pdf_disponible") === "1"; } catch { return false; }
  })();

  const rmIdPago = (() => {
    if (typeof rmIdPagoProp === "string") return rmIdPagoProp;
    try { return sessionStorage.getItem("rm_idPago") || ""; } catch { return ""; }
  })();

  const styles = {
    wrap: { maxWidth: 1200, margin: "0 auto", padding: "16px" },
    header: { marginBottom: 12, display: "flex", alignItems: "baseline", gap: 8 },
    title: { margin: 0, fontSize: 18, fontWeight: 900, color: T.text },
    subtitle: { margin: 0, fontSize: 13, color: T.textMuted },
    card: { padding: 16 },
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
            </p>
          )}
        </div>

        <div className="card" style={styles.card}>
          {/* Render del módulo correspondiente (solo vista/resultado) */}
          {modulo === "trauma" && (
            <>
              <TraumaModulo
                initialDatos={datos}
                onPedirChecklistResonancia={onPedirChecklistResonancia}
                onDetectarResonancia={onDetectarResonancia}
                resumenResoTexto={resumenResoTexto}
              />
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

          {modulo === "preop" && (
            <PreopModulo initialDatos={datos} />
          )}

          {modulo === "generales" && (
            <GeneralesModulo initialDatos={datos} />
          )}

          {modulo === "ia" && (
            <>
              <IAModulo
                initialDatos={datos}
                pedirChecklistResonancia={onPedirChecklistResonancia}
              />
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
