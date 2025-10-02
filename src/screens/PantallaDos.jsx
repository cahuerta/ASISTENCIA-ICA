// src/screens/PantallaDos.jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";

/* Módulos (sin tocar su lógica interna) */
import IAModulo from "../modules/IAModulo.jsx";
import TraumaModulo from "../modules/TraumaModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";

/**
 * PantallaDos
 * - Solo orquesta: selector de módulo + render del módulo activo.
 * - No incluye esquema ni mappers. Eso lo maneja cada MÓDULO internamente (IA/Trauma).
 * - Pasa initialDatos a todos los módulos (compat).
 * - Expone onUpdateDatos opcional: si un módulo lo llama, actualiza estado y sessionStorage["datosPacienteJSON"].
 * - Opcionalmente recibe onPagarTrauma / onSimularPagoGuest para módulos que lo soporten.
 */
export default function PantallaDos({
  initialDatos = {},
  onVolver,
  onPagarTrauma,       // opcional: si Trauma/IA lo usan
  onSimularPagoGuest,  // opcional: si Trauma/IA lo usan
}) {
  const [modulo, setModulo] = useState("ia");      // "ia" | "trauma" | "generales" | "preop"
  const [datos, setDatos] = useState(initialDatos || {});

  // Sincronizar si initialDatos cambia (ej. al volver desde otra pantalla)
  useEffect(() => {
    setDatos(initialDatos || {});
    // Sincronía defensiva: dejar reflejo en sessionStorage para módulos que leen directo
    try {
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(initialDatos || {}));
    } catch {}
  }, [initialDatos]);

  // Orquestador: permite que un módulo actualice datos del paciente si lo desea
  const onUpdateDatos = useCallback((patch = {}) => {
    setDatos((prev) => {
      const next = { ...prev, ...(patch || {}) };
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <div className="app">
      <div className="card">
        <div className="section">
          <h1 className="h1">Selecciona un módulo</h1>
          {onVolver && (
            <button className="btn secondary nowrap" onClick={onVolver}>
              Volver
            </button>
          )}
        </div>
        <div className="divider" />

        {/* Selector de módulos – simple y claro */}
        <div className="grid-autofit">
          {[
            { key: "ia", title: "IA" },
            { key: "trauma", title: "Trauma" },
            { key: "generales", title: "Generales" },
            { key: "preop", title: "Preoperatorio" },
          ].map((m) => (
            <button
              key={m.key}
              className={`btn ${modulo === m.key ? "" : "secondary"} fullw`}
              onClick={() => setModulo(m.key)}
            >
              {modulo === m.key ? `✓ ${m.title}` : `Abrir ${m.title}`}
            </button>
          ))}
        </div>

        {/* Render directo del módulo activo — sin esquema aquí */}
        <div className="card mt-16">
          {modulo === "ia" && (
            <IAModulo
              initialDatos={datos}
              onUpdateDatos={onUpdateDatos}    // opcional
              onPagarAhora={onPagarTrauma}     // opcional (si tu módulo lo usa)
              onSimularPago={onSimularPagoGuest}
            />
          )}

          {modulo === "trauma" && (
            <TraumaModulo
              initialDatos={datos}
              onUpdateDatos={onUpdateDatos}    // opcional
              onPagarAhora={onPagarTrauma}     // opcional
              onSimularPago={onSimularPagoGuest}
            />
          )}

          {modulo === "generales" && (
            <GeneralesModulo
              initialDatos={datos}
              onUpdateDatos={onUpdateDatos}    // opcional
            />
          )}

          {modulo === "preop" && (
            <PreopModulo
              initialDatos={datos}
              onUpdateDatos={onUpdateDatos}    // opcional
            />
          )}
        </div>
      </div>
    </div>
  );
}
