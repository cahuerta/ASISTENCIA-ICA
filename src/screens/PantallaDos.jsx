// src/screens/PantallaDos.jsx
"use client";
import React, { useState, useCallback } from "react";
import FormularioPacienteBasico from "../FormularioPacienteBasico.jsx";

/**
 * Pantalla 2 — Formulario Paciente Básico
 * - Usa el módulo exacto que indicaste: FormularioPacienteBasico.
 * - Sin CSS inline; solo clases existentes de tu app.css.
 * - Mejora UX: contenedor .app + .card y header con Volver.
 *
 * Props esperadas:
 *  - onVolver?: () => void
 *  - onContinuar?: (datosPaciente) => void
 *  - initialDatos?: object
 *  - modoInvitado?: boolean
 */
export default function PantallaDos({
  onVolver,
  onContinuar,
  initialDatos = { nombre: "", rut: "", edad: "", genero: "" },
  modoInvitado = false,
}) {
  const [datos, setDatos] = useState(initialDatos);

  const onCambiarDato = useCallback((key, value) => {
    setDatos((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      // El propio formulario valida RUT/edad y hace preventDefault si corresponde.
      // Si llega aquí, avanzamos con los datos actuales.
      if (typeof onContinuar === "function") {
        // Persistencia mínima de sesión (opcional, no rompe nada)
        try {
          localStorage.setItem("ICA_PACIENTE_BASICO", JSON.stringify(datos));
        } catch {}
        onContinuar(datos);
      }
    },
    [onContinuar, datos]
  );

  return (
    <div className="app">
      <div className="card">
        <div className="section">
          <h1 className="h1">Ingreso Personas · Datos básicos</h1>
          {onVolver && (
            <button className="btn secondary nowrap" onClick={onVolver}>
              Volver
            </button>
          )}
        </div>

        <div className="divider" />

        <FormularioPacienteBasico
          datos={datos}
          onCambiarDato={onCambiarDato}
          onSubmit={handleSubmit}
          modoInvitado={modoInvitado}
        />
      </div>
    </div>
  );
}
