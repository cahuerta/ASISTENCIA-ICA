// src/PantallaDos.jsx
"use client";
import React, { useMemo, useState } from "react";

/* Módulos existentes (no se modifican) */
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";

/* Lee datos guardados por PantallaUno / formulario */
function leerInitialDatos() {
  try {
    const raw = sessionStorage.getItem("datosPacienteJSON");
    if (raw) return JSON.parse(raw);
  } catch {}
  // Fallback “guest” compatible con tu backend
  return {
    nombre: "INVITADO",
    rut: "11.111.111-1",
    edad: "",
    genero: "",
    dolor: "",
    lado: "",
  };
}

export default function PantallaDos() {
  const [moduloActivo, setModuloActivo] = useState(null);

  // Capturamos una sola vez los datos iniciales para todos los módulos
  const initialDatos = useMemo(() => leerInitialDatos(), []);

  // Tabla de módulos → componente (para montar sin condimentos extra)
  const Modulo = useMemo(() => {
    if (moduloActivo === "ia") return IAModulo;
    if (moduloActivo === "trauma") return TraumaModulo;
    if (moduloActivo === "generales") return GeneralesModulo;
    if (moduloActivo === "preop") return PreopModulo;
    return null;
  }, [moduloActivo]);

  // Cuando hay módulo activo: renderiza SOLO el módulo (nada más alrededor)
  if (Modulo) {
    try {
      // Deja rastro mínimo como hacía App.jsx
      sessionStorage.setItem("modulo", String(moduloActivo));
    } catch {}
    return <Modulo key={`mod-${moduloActivo}`} initialDatos={initialDatos} />;
  }

  // Pantalla de selección: solo botones que abren el módulo
  return (
    <div className="card" style={{ maxWidth: 680, margin: "0 auto" }}>
      <h2 className="h1" style={{ marginTop: 0 }}>Selecciona un módulo</h2>

      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        <button
          className="btn fullw"
          onClick={() => setModuloActivo("ia")}
          aria-label="Abrir IA"
        >
          Abrir IA
        </button>

        <button
          className="btn fullw"
          onClick={() => setModuloActivo("trauma")}
          aria-label="Abrir Trauma"
        >
          Abrir Trauma
        </button>

        <button
          className="btn fullw"
          onClick={() => setModuloActivo("generales")}
          aria-label="Abrir Generales"
        >
          Abrir Generales
        </button>

        <button
          className="btn fullw"
          onClick={() => setModuloActivo("preop")}
          aria-label="Abrir Preoperatorio"
        >
          Abrir Preoperatorio
        </button>
      </div>
    </div>
  );
}
