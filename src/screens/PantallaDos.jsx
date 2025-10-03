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
 * - Muestra solo los botones de módulos.
 * - Sin módulo por defecto.
 * - Al elegir un módulo, PantallaDos deja de renderizar su UI y devuelve el módulo directamente.
 * - Los módulos son autónomos; solo se pasa initialDatos (si hay).
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

  // Datos persistidos (o vienen por props)
  const datos = initialDatos || (() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  // 🔀 En cuanto hay selección, devolver SOLO ese módulo (PantallaDos “desaparece”).
  if (modulo === "trauma")    return <TraumaModulo    initialDatos={datos || {}} />;
  if (modulo === "preop")     return <PreopModulo     initialDatos={datos || {}} />;
  if (modulo === "generales") return <GeneralesModulo initialDatos={datos || {}} />;
  if (modulo === "ia")        return <IAModulo        initialDatos={datos || {}} />;

  // UI de selección (sin módulo activo)
  return (
    <div className="app" style={cssVars}>
      <div style={styles(T).wrap}>
        <div style={styles(T).topBar}>
          {[
            { key: "trauma",    label: "ASISTENTE TRAUMATOLÓGICO" },
            { key: "preop",     label: "EXÁMENES PREQUIRÚRGICOS" },
            { key: "generales", label: "REVISIÓN GENERAL" },
            { key: "ia",        label: "ANÁLISIS MEDIANTE IA" },
          ].map((b) => (
            <button
              key={b.key}
              type="button"
              className="btn"
              style={styles(T).btn}
              onClick={() => setModulo(b.key)}
              aria-label={`Abrir ${b.label}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="card" style={styles(T).card}>
          <div style={styles(T).info}>
            {datos?.nombre
              ? <>Paciente: <strong>{datos.nombre}</strong>{datos.rut ? ` — RUT: ${datos.rut}` : ""}</>
              : <>Seleccione un módulo para continuar.</>}
          </div>
          <div style={styles(T).hintBox}>
            Elija un módulo arriba para iniciar. Cada módulo usará los datos ya ingresados.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Estilos compactos y responsivos ===== */
function styles(T) {
  return {
    wrap: { maxWidth: 1200, margin: "0 auto", padding: "clamp(12px,2vw,16px)" },
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
    card: { padding: "clamp(12px,2.2vw,16px)" },
    info: { margin: "6px 0 12px", color: T.textMuted, fontSize: "clamp(12px,1.6vw,13px)" },
    hintBox: {
      padding: 14,
      borderRadius: 10,
      border: `1px dashed ${T.border}`,
      color: T.textMuted,
      background: T.surface,
      textAlign: "center",
      fontSize: "clamp(12px,1.7vw,14px)",
    },
  };
}
