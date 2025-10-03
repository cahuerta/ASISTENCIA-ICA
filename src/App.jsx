// src/App.jsx
"use client";
import React, { useEffect, useState } from "react";
import "./app.css";                // CSS global (se mantiene)
import { getTheme } from "./theme.js"; // Para coherencia de UX (sin sobreescribir estilos de las pantallas)

// Pantallas
import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";

const T = getTheme();

/**
 * Flujo:
 * - PantallaUno: Logo + botones (Ingreso Persona / Guest). Al guardar o Guest → PantallaDos.
 * - PantallaDos: Selector de módulos (Trauma / Preop / Generales / IA). Usa initialDatos (no repite formulario).
 * - PantallaTres: Vista previa/resultado del módulo seleccionado, usando los datos ya guardados.
 *
 * Notas:
 * - No se altera la lógica interna de tus módulos.
 * - Los datos del paciente se guardan/leen desde sessionStorage (compatibles con tu flujo actual).
 * - Si necesitas que PantallaDos “avise” el módulo elegido para PantallaTres, aquí ya está el
 *   `goPantallaTres(modulo)`. Puedes llamarlo desde donde lo definas (sin cambiar la lógica de módulos).
 */
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

  // Módulo seleccionado para la vista previa (PantallaTres)
  const [moduloActual, setModuloActual] = useState(() => {
    try {
      const m = sessionStorage.getItem("modulo");
      return ["trauma", "preop", "generales", "ia"].includes(m) ? m : "trauma";
    } catch {
      return "trauma";
    }
  });

  // Mantener coherencia con sessionStorage (no cambia tu lógica, solo sincroniza estado local)
  useEffect(() => {
    try {
      if (moduloActual) sessionStorage.setItem("modulo", moduloActual);
    } catch {}
  }, [moduloActual]);

  /** Navegación desde PantallaUno → PantallaDos */
  const goPantallaDos = (datosOpcionales) => {
    // Si PantallaUno entrega datos, los guardamos; si no, usamos lo que ya está en sessionStorage.
    const next =
      datosOpcionales && typeof datosOpcionales === "object"
        ? datosOpcionales
        : (() => {
            try {
              const raw = sessionStorage.getItem("datosPacienteJSON");
              return raw ? JSON.parse(raw) : null;
            } catch {
              return null;
            }
          })();

    if (next) {
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
      } catch {}
      setDatosPaciente(next);
    }
    setPantalla("dos");
  };

  /** (Opcional) Navegación a PantallaTres, permitiendo fijar el módulo a previsualizar */
  const goPantallaTres = (moduloElegido) => {
    if (moduloElegido && ["trauma", "preop", "generales", "ia"].includes(moduloElegido)) {
      setModuloActual(moduloElegido);
      try { sessionStorage.setItem("modulo", moduloElegido); } catch {}
    }
    setPantalla("tres");
  };

  /** Volver a PantallaUno (si lo necesitas) */
  const goPantallaUno = () => setPantalla("uno");

  // No aplico estilos de theme aquí para no duplicar wrappers; cada Pantalla ya usa theme y app.css.
  return (
    <>
      {pantalla === "uno" && (
        <PantallaUno
          onIrPantallaDos={goPantallaDos}
        />
      )}

      {pantalla === "dos" && (
        <PantallaDos
          initialDatos={datosPaciente}
          // Si deseas, desde algún punto puedes llamar a goPantallaTres("preop" | "trauma" | "generales" | "ia")
          // pasándolo como prop. No activo nada extra para no cambiar tu lógica.
          // onIrPantallaTres={goPantallaTres}
        />
      )}

      {pantalla === "tres" && (
        <PantallaTres
          initialDatos={datosPaciente}
          moduloInicial={moduloActual}
          // Props opcionales por si las usas en módulos de Trauma/IA:
          // onPedirChecklistResonancia={...}
          // onDetectarResonancia={...}
          // resumenResoTexto={...}
        />
      )}
    </>
  );
}
