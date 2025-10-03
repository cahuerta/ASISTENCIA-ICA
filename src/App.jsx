// src/App.jsx
"use client";
import React, { useState } from "react";
import "./app.css";

import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";

export default function App() {
  const [pantalla, setPantalla] = useState("uno"); // "uno" | "dos" | "tres"
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Avanza desde PantallaUno a PantallaDos (Guest o Ingreso Persona).
  // Recibe 'datos' si el formulario básico devuelve un objeto; si no, lee desde sessionStorage.
  const irPantallaDos = (datos) => {
    let next = datos;
    if (!next) {
      try {
        const raw = sessionStorage.getItem("datosPacienteJSON");
        next = raw ? JSON.parse(raw) : null;
      } catch {
        next = null;
      }
    }
    if (next) {
      setDatosPaciente(next);
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
    }
    setPantalla("dos");
  };

  // Avanza a PantallaTres cuando tú lo indiques en el flujo (no asumimos desde dónde).
  const irPantallaTres = () => setPantalla("tres");

  // Navegación mínima (sin cambiar tu lógica interna de módulos).
  if (pantalla === "uno") {
    return <PantallaUno onIrPantallaDos={irPantallaDos} />;
  }

  if (pantalla === "dos") {
    return (
      <PantallaDos
        initialDatos={datosPaciente}
        // Cuando quieras mostrar la preview final, llama a irPantallaTres desde donde lo definas.
        // No lo conecto aquí para no inventar pasos no pedidos.
      />
    );
  }

  // pantalla === "tres"
  return (
    <PantallaTres
      initialDatos={datosPaciente}
    />
  );
}
