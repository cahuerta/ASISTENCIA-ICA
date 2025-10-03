// src/PantallaDos.jsx
"use client";
import React, { useEffect, useState } from "react";

/* Módulos existentes (NO se tocan) */
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";

/**
 * PantallaDos
 * - Menú simple: muestra SOLO botones para elegir módulo.
 * - Al elegir, renderiza SOLO el módulo seleccionado (sin superponer el menú).
 * - Pasa initialDatos leyendo exactamente lo que usa la app: sessionStorage.datosPacienteJSON
 * - No duplica flujos ni previews; no inventa variables.
 */
export default function PantallaDos({ onVolver }) {
  const [moduloActivo, setModuloActivo] = useState(null);
  const [initialDatos, setInitialDatos] = useState({});

  // Cargar datos básicos exactamente desde la misma clave usada por la app
  const cargarDatosPaciente = () => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      setInitialDatos(raw ? JSON.parse(raw) : {});
    } catch {
      setInitialDatos({});
    }
  };

  useEffect(() => {
    cargarDatosPaciente();
  }, [moduloActivo]); // cuando abres un módulo, refresca initialDatos

  const abrir = (key) => {
    try { sessionStorage.setItem("modulo", key); } catch {}
    setModuloActivo(key);
  };

  const cerrarModulo = () => {
    setModuloActivo(null); // vuelve al menú sin dejar nada montado
  };

  /* ======================= RENDER EXCLUSIVO DEL MÓDULO ======================= */
  if (moduloActivo === "ia") {
    return (
      <div className="card" style={{ padding: 0, border: "none", background: "transparent" }}>
        <div className="toolbar mb-12">
          <button className="btn ghost" onClick={cerrarModulo}>← Volver</button>
          {onVolver && <button className="btn secondary" onClick={onVolver}>Salir</button>}
        </div>
        <IAModulo initialDatos={initialDatos} />
      </div>
    );
  }

  if (moduloActivo === "trauma") {
    return (
      <div className="card" style={{ padding: 0, border: "none", background: "transparent" }}>
        <div className="toolbar mb-12">
          <button className="btn ghost" onClick={cerrarModulo}>← Volver</button>
          {onVolver && <button className="btn secondary" onClick={onVolver}>Salir</button>}
        </div>
        <TraumaModulo initialDatos={initialDatos} />
      </div>
    );
  }

  if (moduloActivo === "generales") {
    return (
      <div className="card" style={{ padding: 0, border: "none", background: "transparent" }}>
        <div className="toolbar mb-12">
          <button className="btn ghost" onClick={cerrarModulo}>← Volver</button>
          {onVolver && <button className="btn secondary" onClick={onVolver}>Salir</button>}
        </div>
        <GeneralesModulo initialDatos={initialDatos} />
      </div>
    );
  }

  if (moduloActivo === "preop") {
    return (
      <div className="card" style={{ padding: 0, border: "none", background: "transparent" }}>
        <div className="toolbar mb-12">
          <button className="btn ghost" onClick={cerrarModulo}>← Volver</button>
          {onVolver && <button className="btn secondary" onClick={onVolver}>Salir</button>}
        </div>
        <PreopModulo initialDatos={initialDatos} />
      </div>
    );
  }

  /* ======================= MENÚ (SOLO BOTONES) ======================= */
  return (
    <div className="card" data-screen="pantalla-dos" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="section">
        <h2 className="h1" style={{ margin: 0 }}>Selecciona un módulo</h2>
        {onVolver && <button className="btn ghost" onClick={onVolver}>Salir</button>}
      </div>
      <div className="divider" />
      <div style={{ display: "grid", gap: 12 }}>
        <button className="btn fullw" onClick={() => abrir("ia")}>Abrir IA</button>
        <button className="btn fullw" onClick={() => abrir("trauma")}>Abrir Trauma</button>
        <button className="btn fullw" onClick={() => abrir("generales")}>Abrir Generales</button>
        <button className="btn fullw" onClick={() => abrir("preop")}>Abrir Preoperatorio</button>
      </div>
    </div>
  );
}
