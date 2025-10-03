// src/PantallaDos.jsx
"use client";
import React from "react";

/**
 * PantallaDos
 * - Muestra SOLO el selector de módulos.
 * - No importa ni renderiza ningún módulo.
 * - Cada botón llama onOpen(<modulo>) para que el PADRE haga la navegación.
 */
export default function PantallaDos({ onOpen, onVolver }) {
  const abrir = (key) => {
    try { sessionStorage.setItem("modulo", key); } catch {}
    onOpen?.(key);
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <h2 className="h1" style={{ marginTop: 0, marginBottom: 8 }}>Selecciona un módulo</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
        Elige el flujo que quieres iniciar
      </p>

      <div className="grid-autofit">
        <div className="card">
          <div className="section">
            <strong>IA</strong>
          </div>
          <button className="btn fullw mt-12" onClick={() => abrir("ia")}>
            Abrir IA
          </button>
        </div>

        <div className="card">
          <div className="section">
            <strong>Trauma</strong>
          </div>
          <button className="btn fullw mt-12" onClick={() => abrir("trauma")}>
            Abrir Trauma
          </button>
        </div>

        <div className="card">
          <div className="section">
            <strong>Generales</strong>
          </div>
          <button className="btn fullw mt-12" onClick={() => abrir("generales")}>
            Abrir Generales
          </button>
        </div>

        <div className="card">
          <div className="section">
            <strong>Preoperatorio</strong>
          </div>
          <button className="btn fullw mt-12" onClick={() => abrir("preop")}>
            Abrir Preoperatorio
          </button>
        </div>
      </div>

      {onVolver && (
        <div className="toolbar mt-16">
          <button className="btn secondary" onClick={onVolver}>Volver</button>
        </div>
      )}
    </div>
  );
}
