// src/screens/PantallaTres.jsx
"use client";
import React from "react";

/**
 * Pantalla 3 — Selector de Módulos
 * - No cambia nombres ni props globales.
 * - Usa onElegir(mod) para que App.jsx navegue al módulo.
 *   mod: "ia" | "trauma" | "generales" | "preop" | "mapper"
 *
 * Props:
 *  - onElegir: (mod: string) => void
 *  - onVolver?: () => void   // opcional: volver a Pantalla 2 o 1 según tu orquestación
 */
export default function PantallaTres({ onElegir, onVolver }) {
  const go = (mod) => {
    if (typeof onElegir === "function") onElegir(mod);
  };

  return (
    <div className="app ica-p3">
      <div className="card">
        <div className="section">
          <h1 className="h1">Selecciona un módulo</h1>
          {onVolver && (
            <button className="btn secondary nowrap" onClick={onVolver}>
              Volver
            </button>
          )}
        </div>

        <div className="divider" />

        {/* Grid de opciones */}
        <div className="grid-autofit">
          {/* IA */}
          <div className="card">
            <h3 className="h1">Asistente IA</h3>
            <p className="muted">Generación asistida (orden RM, texto clínico, etc.).</p>
            <div className="toolbar mt-12">
              <button className="btn fullw" onClick={() => go("ia")}>
                Ir a IA
              </button>
            </div>
          </div>

          {/* Trauma */}
          <div className="card">
            <h3 className="h1">Trauma</h3>
            <p className="muted">Flujos específicos de traumatología.</p>
            <div className="toolbar mt-12">
              <button className="btn fullw" onClick={() => go("trauma")}>
                Ir a Trauma
              </button>
            </div>
          </div>

          {/* Generales */}
          <div className="card">
            <h3 className="h1">Generales</h3>
            <p className="muted">Documentos y formularios clínicos generales.</p>
            <div className="toolbar mt-12">
              <button className="btn fullw" onClick={() => go("generales")}>
                Ir a Generales
              </button>
            </div>
          </div>

          {/* Preoperatorio */}
          <div className="card">
            <h3 className="h1">Preoperatorio</h3>
            <p className="muted">Checklist y documentación pre quirúrgica.</p>
            <div className="toolbar mt-12">
              <button className="btn fullw" onClick={() => go("preop")}>
                Ir a Preop
              </button>
            </div>
          </div>

          {/* Mapper */}
          <div className="card">
            <h3 className="h1">Mapa corporal</h3>
            <p className="muted">Esquemas con puntos marcables (rodilla, mano, hombro…).</p>
            <div className="toolbar mt-12">
              <button className="btn fullw" onClick={() => go("mapper")}>
                Ir al Mapa
              </button>
            </div>
          </div>
        </div>

        <div className="divider" />
        <p className="muted">Puedes volver y cambiar de módulo en cualquier momento.</p>
      </div>
    </div>
  );
}
