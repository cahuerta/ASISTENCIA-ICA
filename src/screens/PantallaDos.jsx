// src/PantallaDos.jsx
"use client";
import React from "react";

/**
 * PantallaDos
 * - Muestra SOLO los botones para elegir módulo.
 * - No importa ni renderiza módulos.
 * - Llama onOpen(<key>) para que el PADRE haga la navegación.
 */
export default function PantallaDos({ onOpen, onVolver }) {
  const abrir = (key) => {
    try { sessionStorage.setItem("modulo", key); } catch {}
    if (typeof onOpen === "function") onOpen(key);
  };

  return (
    <div className="card" data-screen="pantalla-dos" style={{ padding: 16 }}>
      <h2 className="h1 center" style={{ marginTop: 0, marginBottom: 12 }}>
        Selecciona un módulo
      </h2>

      <div className="mt-12" style={{ display: "grid", gap: 12 }}>
        <button className="btn fullw" onClick={() => abrir("ia")}>Abrir IA</button>
        <button className="btn fullw" onClick={() => abrir("trauma")}>Abrir Trauma</button>
        <button className="btn fullw" onClick={() => abrir("generales")}>Abrir Generales</button>
        <button className="btn fullw" onClick={() => abrir("preop")}>Abrir Preoperatorio</button>
      </div>

      {onVolver && (
        <button className="btn secondary mt-16" onClick={onVolver}>
          Volver
        </button>
      )}
    </div>
  );
}
