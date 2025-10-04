// src/App.jsx
"use client";
import React, { useState, useEffect } from "react";
import "./app.css";

import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";

export default function App() {
  // Inicializa pantalla:
  // - Si venimos del pago con ?pago=ok → ir directo a "tres"
  // - Si hay una pantalla guardada en sessionStorage → usarla
  // - Si no, partir en "uno"
  const initPantalla = () => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("pago") === "ok") return "tres";
      const saved = sessionStorage.getItem("pantalla");
      return saved || "uno";
    } catch {
      return "uno";
    }
  };

  const [pantalla, setPantalla] = useState(initPantalla); // "uno" | "dos" | "tres"
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Persistir pantalla para restaurar flujo entre recargas/retornos
  useEffect(() => {
    try { sessionStorage.setItem("pantalla", pantalla); } catch {}
  }, [pantalla]);

  // Si aterrizamos en "tres" (por retorno de pago) y no hay datos en estado, hidratar desde sessionStorage
  useEffect(() => {
    if (pantalla === "tres" && !datosPaciente) {
      try {
        const raw = sessionStorage.getItem("datosPacienteJSON");
        if (raw) setDatosPaciente(JSON.parse(raw));
      } catch {}
    }
  }, [pantalla, datosPaciente]);

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

  // Avanza a PantallaTres cuando tú lo indiques en el flujo.
  // (Permite opcionalmente actualizar y persistir datos antes de pasar)
  const irPantallaTres = (datos) => {
    if (datos) {
      setDatosPaciente(datos);
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos)); } catch {}
    }
    setPantalla("tres");
  };

  // Navegación mínima (sin cambiar tu lógica interna de módulos).
  if (pantalla === "uno") {
    return <PantallaUno onIrPantallaDos={irPantallaDos} />;
  }

  if (pantalla === "dos") {
    return (
      <PantallaDos
        initialDatos={datosPaciente}
        onIrPantallaTres={irPantallaTres}
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
