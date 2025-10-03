// src/PantallaDos.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

/* Módulos existentes (sin tocarlos) */
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";

function Btn({ children, onClick }) {
  return (
    <button className="btn fullw" type="button" onClick={onClick} style={{ marginBottom: 12 }}>
      {children}
    </button>
  );
}

export default function PantallaDos({ onVolver }) {
  const [moduloActivo, setModuloActivo] = useState(null);
  const [datosSS, setDatosSS] = useState(null);

  // Carga datos del paciente desde sessionStorage (misma clave que usa la app)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      if (raw) setDatosSS(JSON.parse(raw));
    } catch {
      setDatosSS(null);
    }
  }, []);

  const initialDatos = useMemo(() => {
    return (datosSS && typeof datosSS === "object") ? datosSS : {};
  }, [datosSS]);

  // Si hay módulo activo → render exclusivo del módulo (sin menú alrededor)
  if (moduloActivo) {
    const VolverBtn = () => (
      <div style={{ margin: "12px 0" }}>
        <button
          className="btn ghost"
          type="button"
          onClick={() => setModuloActivo(null)}
          aria-label="Volver a selección de módulos"
          style={{ width: "100%" }}
        >
          Volver
        </button>
      </div>
    );

    if (moduloActivo === "ia") return (<><VolverBtn /><IAModulo initialDatos={initialDatos} /></>);
    if (moduloActivo === "trauma") return (<><VolverBtn /><TraumaModulo initialDatos={initialDatos} /></>);
    if (moduloActivo === "generales") return (<><VolverBtn /><GeneralesModulo initialDatos={initialDatos} /></>);
    if (moduloActivo === "preop") return (<><VolverBtn /><PreopModulo initialDatos={initialDatos} /></>);
  }

  // Vista inicial: SOLO los botones (sin nada más)
  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="section">
        <h2 className="h1" style={{ margin: 0 }}>Selecciona un módulo</h2>
        {onVolver && <button className="btn ghost" type="button" onClick={onVolver}>Salir</button>}
      </div>
      <div className="divider" />
      <div style={{ marginTop: 8 }}>
        <Btn onClick={() => setModuloActivo("ia")}>Abrir IA</Btn>
        <Btn onClick={() => setModuloActivo("trauma")}>Abrir Trauma</Btn>
        <Btn onClick={() => setModuloActivo("generales")}>Abrir Generales</Btn>
        <Btn onClick={() => setModuloActivo("preop")}>Abrir Preoperatorio</Btn>
      </div>
    </div>
  );
}
