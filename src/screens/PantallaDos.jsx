// src/screens/PantallaDos.jsx
"use client";
import React, { useEffect, useState } from "react";
import { getTheme } from "../theme.js";

import IAModulo from "../modules/IAModulo.jsx";
import TraumaModulo from "../modules/TraumaModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";

const T = getTheme();

export default function PantallaDos() {
  // modo = "seleccion" (solo botones) | "modulo" (solo módulo activo)
  const [modo, setModo] = useState(() => {
    try {
      const m = sessionStorage.getItem("modulo");
      return m ? "modulo" : "seleccion";
    } catch {
      return "seleccion";
    }
  });

  const [modulo, setModulo] = useState(() => {
    try {
      const m = sessionStorage.getItem("modulo");
      return ["ia", "trauma", "generales", "preop"].includes(m) ? m : null;
    } catch {
      return null;
    }
  });

  // Datos del paciente para pasar a los módulos (compatibilidad total)
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      if (raw) setDatosPaciente(JSON.parse(raw));
    } catch {}
  }, []);

  const activarModulo = (key) => {
    setModulo(key);
    setModo("modulo");
    try { sessionStorage.setItem("modulo", key); } catch {}
  };

  const volverASeleccion = () => {
    setModo("seleccion");
    // mantenemos el módulo en sessionStorage por si recargas y quieres “continuar”;
    // si prefieres limpiar, descomenta la siguiente línea:
    // try { sessionStorage.removeItem("modulo"); } catch {}
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* ENCABEZADO */}
      <div className="section">
        <h2 className="h1" style={{ margin: 0 }}>Selecciona un módulo</h2>
        {modo === "modulo" && (
          <button className="btn secondary" onClick={volverASeleccion}>
            Volver
          </button>
        )}
      </div>
      <div className="divider" />

      {/* SOLO SELECTOR */}
      {modo === "seleccion" && (
        <div className="grid-autofit">
          {[
            { key: "ia", label: "IA" },
            { key: "trauma", label: "Trauma" },
            { key: "generales", label: "Generales" },
            { key: "preop", label: "Preoperatorio" },
          ].map((b) => (
            <div key={b.key} className="card">
              <div className="section">
                <div style={{ fontWeight: 700, fontSize: 18 }}>{b.label}</div>
              </div>
              <button
                className="btn fullw mt-12"
                onClick={() => activarModulo(b.key)}
              >
                Abrir {b.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SOLO MÓDULO ACTIVO */}
      {modo === "modulo" && (
        <div className="mt-12">
          {modulo === "ia" && (
            <IAModulo initialDatos={datosPaciente} />
          )}
          {modulo === "trauma" && (
            <TraumaModulo
              initialDatos={datosPaciente}
              // props opcionales se mantienen; si no los usas, no afectan
            />
          )}
          {modulo === "generales" && (
            <GeneralesModulo initialDatos={datosPaciente} />
          )}
          {modulo === "preop" && (
            <PreopModulo initialDatos={datosPaciente} />
          )}
        </div>
      )}
    </div>
  );
}
