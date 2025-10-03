// src/App.jsx
"use client";
import React, { useState } from "react";
import "./app.css";

// Pantallas (en src/screens)
import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";

/**
 * Orquestación mínima:
 * - PantallaUno: muestra logo + botones (Ingreso Persona / Guest). Al continuar → PantallaDos.
 * - PantallaDos: selección y ejecución de módulos (usa datos ya guardados, no repite formulario).
 * - PantallaTres: vista/preview final del módulo (lee lo necesario, no reimplementa lógica).
 *
 * No se alteran: sessionStorage, flujos internos, ni props de tus módulos.
 */
export default function App() {
  const [pantalla, setPantalla] = useState("uno"); // "uno" | "dos" | "tres"

  // Avanzar desde la pantalla 1 a la 2 (PantallaUno ya guarda datos si corresponde)
  const irPantallaDos = () => setPantalla("dos");

  // Avanzar desde la 2 a la 3 (si PantallaDos decide previsualizar)
  const irPantallaTres = () => setPantalla("tres");

  // Volver si hace falta
  const volverPantallaUno = () => setPantalla("uno");
  const volverPantallaDos = () => setPantalla("dos");

  if (pantalla === "uno") {
    return (
      <PantallaUno
        onIrPantallaDos={irPantallaDos}
      />
    );
  }

  if (pantalla === "dos") {
    return (
      <PantallaDos
        // Prop opcional por si luego quieres navegar a la preview desde aquí
        onIrPantallaTres={irPantallaTres}
        // No paso más props para no modificar tu lógica:
        // cada módulo dentro de PantallaDos lee/usa lo que ya tienes guardado.
      />
    );
  }

  // pantalla === "tres"
  return (
    <PantallaTres
      // onVolver es opcional; si lo usas, vuelve a módulos
      onVolver={volverPantallaDos}
    />
  );
}
