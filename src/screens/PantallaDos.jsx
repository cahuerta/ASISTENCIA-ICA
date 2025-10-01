// src/screens/PantallaDos.jsx
"use client";
import React, { useState } from "react";

/* Módulos existentes (sin cambiar nombres ni props) */
import IAModulo from "../modules/IAModulo.jsx";
import TraumaModulo from "../modules/TraumaModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";

/**
 * Pantalla 2 — Selector y render directo de módulos
 * - Muestra 4 botones (IA / Trauma / Generales / Preop).
 * - Al presionar, abre **directamente** el módulo seleccionado (sin otra pantalla).
 * - Usa solo clases CSS de app.css (sin estilos inline).
 *
 * Props:
 *  - initialDatos?: object   // datos del paciente (opcional)
 *  - onVolver?: () => void   // volver al ingreso (opcional)
 */
export default function PantallaDos({ initialDatos = {}, onVolver }) {
  const [modulo, setModulo] = useState(null); // null = selector; otro = módulo abierto

  const Titulo = () => (
    <div className="section">
      <h1 className="h1">
        {modulo === null ? "Selecciona un módulo" :
          modulo === "ia" ? "IA" :
          modulo === "trauma" ? "Trauma" :
          modulo === "generales" ? "Generales" :
          modulo === "preop" ? "Preoperatorio" : ""}
      </h1>

      {/* Botón Volver (si estás viendo un módulo vuelve al selector; si estás en selector y pasas onVolver, vuelve al ingreso) */}
      {modulo !== null ? (
        <button className="btn secondary nowrap" onClick={() => setModulo(null)}>
          Volver
        </button>
      ) : (
        onVolver && (
          <button className="btn secondary nowrap" onClick={onVolver}>
            Volver
          </button>
        )
      )}
    </div>
  );

  return (
    <div className="app ica-p2">
      <div className="card">
        <Titulo />
        <div className="divider" />

        {/* ===== Selector (modulo === null) ===== */}
        {modulo === null && (
          <div className="grid-autofit">
            <div className="card">
              <h3 className="h1">IA</h3>
              <div className="toolbar mt-12">
                <button className="btn fullw" onClick={() => setModulo("ia")}>
                  Abrir IA
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="h1">Trauma</h3>
              <div className="toolbar mt-12">
                <button className="btn fullw" onClick={() => setModulo("trauma")}>
                  Abrir Trauma
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="h1">Generales</h3>
              <div className="toolbar mt-12">
                <button className="btn fullw" onClick={() => setModulo("generales")}>
                  Abrir Generales
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="h1">Preoperatorio</h3>
              <div className="toolbar mt-12">
                <button className="btn fullw" onClick={() => setModulo("preop")}>
                  Abrir Preop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Render directo del módulo ===== */}
        {modulo === "ia" && <IAModulo initialDatos={initialDatos} />}
        {modulo === "trauma" && <TraumaModulo initialDatos={initialDatos} />}
        {modulo === "generales" && <GeneralesModulo initialDatos={initialDatos} />}
        {modulo === "preop" && <PreopModulo initialDatos={initialDatos} />}
      </div>
    </div>
  );
}
