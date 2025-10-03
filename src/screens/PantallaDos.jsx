// src/screens/PantallaDos.jsx
"use client";
import React, { useState } from "react";
import "../app.css";
import { getTheme } from "../theme.js";

/* Módulos */
import TraumaModulo from "../modules/TraumaModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import IAModulo from "../modules/IAModulo.jsx";

/**
 * Props esperadas:
 * - initialDatos: objeto con los datos del paciente (venidos de PantallaUno o sessionStorage).
 * - onPedirChecklistResonancia?: fn (se pasa a Trauma/IAModulo si decides usarla)
 * - onDetectarResonancia?: fn (se pasa a Trauma/IAModulo si decides usarla)
 * - resumenResoTexto?: fn (se pasa a Trauma/IAModulo si decides usarla)
 *
 * Nota: No se vuelve a pedir formulario. Solo se selecciona el módulo y se le pasa initialDatos.
 */
export default function PantallaDos({
  initialDatos,
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

  const [modulo, setModulo] = useState("trauma");

  const styles = {
    wrap: { maxWidth: 1200, margin: "0 auto", padding: "16px" },
    topBar: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12,
      marginBottom: 12,
    },
    btn: {
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer",
      borderWidth: 2,
      borderStyle: "solid",
      lineHeight: 1.1,
      background: T.surface,
      color: T.primary,
      borderColor: T.primary,
    },
    btnActive: {
      background: T.primary,
      color: T.onPrimary,
      borderColor: T.primaryDark,
      boxShadow: `0 0 0 3px ${T.accentAlpha}, ${T.shadowSm}`,
      transform: "translateY(-1px)",
    },
    card: { padding: 16 },
    info: { margin: "6px 0 12px", color: T.textMuted, fontSize: 13 },
  };

  const datos = initialDatos || (() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  return (
    <div className="app" style={cssVars}>
      <div style={styles.wrap}>
        {/* Selector de módulos */}
        <div style={styles.topBar}>
          {[
            { key: "trauma", label: "ASISTENTE TRAUMATOLÓGICO" },
            { key: "preop", label: "EXÁMENES PREQUIRÚRGICOS" },
            { key: "generales", label: "REVISIÓN GENERAL" },
            { key: "ia", label: "ANÁLISIS MEDIANTE IA" },
          ].map((b) => {
            const active = modulo === b.key;
            return (
              <button
                key={b.key}
                type="button"
                className="btn"
                style={{ ...styles.btn, ...(active ? styles.btnActive : null) }}
                onClick={() => setModulo(b.key)}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        <div className="card" style={styles.card}>
          <div style={styles.info}>
            {datos?.nombre ? (
              <>Paciente: <strong>{datos.nombre}</strong>{datos.rut ? ` — RUT: ${datos.rut}` : ""}</>
            ) : (
              <>Usando datos recibidos. (No se repite formulario.)</>
            )}
          </div>

          {/* Render del módulo seleccionado, siempre pasando initialDatos */}
          {modulo === "trauma" && (
            <TraumaModulo
              initialDatos={datos || {}}
              onPedirChecklistResonancia={onPedirChecklistResonancia}
              onDetectarResonancia={onDetectarResonancia}
              resumenResoTexto={resumenResoTexto}
            />
          )}

          {modulo === "preop" && (
            <PreopModulo initialDatos={datos || {}} />
          )}

          {modulo === "generales" && (
            <GeneralesModulo initialDatos={datos || {}} />
          )}

          {modulo === "ia" && (
            <IAModulo
              initialDatos={datos || {}}
              pedirChecklistResonancia={onPedirChecklistResonancia}
            />
          )}
        </div>
      </div>
    </div>
  );
}
