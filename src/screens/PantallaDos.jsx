// src/PantallaDos.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

/* Módulos existentes (no se tocan) */
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";

/* Botón simple */
function Btn({ children, onClick }) {
  return (
    <button className="btn fullw" type="button" onClick={onClick} style={{ marginBottom: 12 }}>
      {children}
    </button>
  );
}

/**
 * PantallaDos (versión correcta y funcional)
 * - Solo muestra 4 botones.
 * - Al pulsar, reemplaza la vista por el módulo elegido (sin sobre-render).
 * - Pasa initialDatos desde sessionStorage (o desde props si se proveen).
 * - No escribe ni modifica otras claves; deja que cada módulo gestione su flujo.
 */
export default function PantallaDos({ onVolver, initialDatos: initialDatosProp }) {
  const [moduloActivo, setModuloActivo] = useState(null);
  const [datosSS, setDatosSS] = useState(null);

  // Carga defensiva desde sessionStorage (igual clave que usa el resto de la app)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      if (raw) setDatosSS(JSON.parse(raw));
    } catch {
      setDatosSS(null);
    }
  }, []);

  // initialDatos a pasar a los módulos (prioriza SS; luego prop; si no, objeto vacío)
  const initialDatos = useMemo(() => {
    if (datosSS && typeof datosSS === "object") return datosSS;
    if (initialDatosProp && typeof initialDatosProp === "object") return initialDatosProp;
    return {};
  }, [datosSS, initialDatosProp]);

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

  // Vista inicial: SOLO los botones
  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Selecciona un módulo</h2>
        {onVolver && (
          <button className="btn ghost" type="button" onClick={onVolver}>
            Volver
          </button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn onClick={() => setModuloActivo("ia")}>Abrir IA</Btn>
        <Btn onClick={() => setModuloActivo("trauma")}>Abrir Trauma</Btn>
        <Btn onClick={() => setModuloActivo("generales")}>Abrir Generales</Btn>
        <Btn onClick={() => setModuloActivo("preop")}>Abrir Preoperatorio</Btn>
      </div>
    </div>
  );
}
