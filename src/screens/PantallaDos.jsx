// src/screens/PantallaDos.jsx
"use client";
import React, { useState } from "react";
import "../app.css";
import { getTheme } from "../theme.js";

/* Módulos (autosuficientes) */
import TraumaModulo from "../modules/TraumaModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import IAModulo from "../modules/IAModulo.jsx";

/**
 * PantallaDos
 * - Solo muestra botones de módulos.
 * - Sin módulo por defecto.
 * - Cada módulo es independiente: NO se pasan callbacks de control.
 * - Solo se puede pasar initialDatos (o el módulo lee de sessionStorage).
 */
export default function PantallaDos({ initialDatos }) {
  const T = getTheme();

  const cssVars = {
    "--bg": T.bg, "--surface": T.surface, "--border": T.border,
    "--text": T.text, "--text-muted": T.textMuted, "--muted": T.muted,
    "--primary": T.primary, "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
    "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm, "--shadow-md": T.shadowMd,
    "--overlay": T.overlay,
  };

  // Sin valor por defecto
  const [modulo, setModulo] = useState(null); // "trauma" | "preop" | "generales" | "ia" | null

  const styles = {
    wrap: { maxWidth: 1200, margin: "0 auto", padding: "clamp(12px,2vw,16px)" },

    // Barra responsiva: de 1 a 4 columnas según ancho
    topBar: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "clamp(8px,1.4vw,12px)",
      marginBottom: "clamp(10px,1.8vw,14px)",
    },

    btn: {
      borderRadius: 12,
      padding: "clamp(10px,1.6vw,14px) clamp(12px,2.2vw,16px)",
      fontSize: "clamp(13px,1.9vw,15px)",
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
      boxShadow: `0 0 0 2px ${T.accentAlpha}, ${T.shadowSm}`,
      transform: "translateY(-1px)",
    },

    card: { padding: "clamp(12px,2.2vw,16px)" },
    info: { margin: "6px 0 12px", color: T.textMuted, fontSize: "clamp(12px,1.6vw,13px)" },

    hintBox: {
      padding: "14px",
      borderRadius: 10,
      border: `1px dashed ${T.border}`,
      color: T.textMuted,
      background: T.surface,
      textAlign: "center",
      fontSize: "clamp(12px,1.7vw,14px)",
    },
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
        {/* Botones de módulos (sin default) */}
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
            {datos?.nombre
              ? <>Paciente: <strong>{datos.nombre}</strong>{datos.rut ? ` — RUT: ${datos.rut}` : ""}</>
              : <>Seleccione un módulo para continuar.</>}
          </div>

          {/* Render SOLO del módulo elegido (sin control externo) */}
          {modulo === null && (
            <div style={styles.hintBox}>
              Elija un módulo arriba para iniciar. Cada módulo usará los datos ya ingresados.
            </div>
          )}

          {modulo === "trauma" && <TraumaModulo initialDatos={datos || {}} />}

          {modulo === "preop" && <PreopModulo initialDatos={datos || {}} />}

          {modulo === "generales" && <GeneralesModulo initialDatos={datos || {}} />}

          {modulo === "ia" && <IAModulo initialDatos={datos || {}} />}
        </div>
      </div>
    </div>
  );
}
