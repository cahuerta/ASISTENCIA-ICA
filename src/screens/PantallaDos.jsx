// src/PantallaDos.jsx
"use client";
import React, { useState } from "react";

/* Importamos los módulos */
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";

export default function PantallaDos({ onVolver }) {
  const [moduloActivo, setModuloActivo] = useState(null);

  // Renderizar el módulo seleccionado
  if (moduloActivo === "ia") return <IAModulo initialDatos={{}} />;
  if (moduloActivo === "trauma") return <TraumaModulo initialDatos={{}} />;
  if (moduloActivo === "generales") return <GeneralesModulo initialDatos={{}} />;
  if (moduloActivo === "preop") return <PreopModulo initialDatos={{}} />;

  // Vista inicial: solo los botones
  return (
    <div className="card">
      <h2>Selecciona un módulo</h2>

      <button className="btn fullw" onClick={() => setModuloActivo("ia")}>
        Abrir IA
      </button>
      <button className="btn fullw" onClick={() => setModuloActivo("trauma")}>
        Abrir Trauma
      </button>
      <button className="btn fullw" onClick={() => setModuloActivo("generales")}>
        Abrir Generales
      </button>
      <button className="btn fullw" onClick={() => setModuloActivo("preop")}>
        Abrir Preoperatorio
      </button>

      <button className="btn muted mt-6" onClick={onVolver}>
        Volver
      </button>
    </div>
  );
}
