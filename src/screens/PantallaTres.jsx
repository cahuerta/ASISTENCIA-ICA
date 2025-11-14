// src/screens/PantallaTres.jsx
"use client";

import React, { useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { irAPagoFlow } from "../PagoFlow.jsx";

export default function PantallaTres({ datosPaciente, onVolver }) {
  const [loading, setLoading] = useState(null); // "flow" | "khipu" | null

  const handleFlow = async () => {
    try {
      setLoading("flow");
      await irAPagoFlow(datosPaciente);
      // irAPagoFlow se encarga de redirigir, no hay nada más que hacer aquí
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al iniciar el pago con Flow");
      setLoading(null);
    }
  };

  const handleKhipu = async () => {
    try {
      setLoading("khipu");
      await irAPagoKhipu(datosPaciente);
      // irAPagoKhipu también redirige
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al iniciar el pago con Khipu");
      setLoading(null);
    }
  };

  return (
    <div
      className="pantalla pantalla-tres"
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Encabezado */}
      <header style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: 4 }}>Elegir método de pago</h2>
        <p style={{ fontSize: 14, color: "var(--muted-foreground, #666)" }}>
          Seleccione la opción que le resulte más cómoda.
        </p>
      </header>

      {/* Resumen del paciente (opcional) */}
      {datosPaciente && (
        <section
          style={{
            borderRadius: 12,
            padding: 12,
            border: "1px solid var(--border, #e0e0e0)",
            background: "var(--card, #fafafa)",
            fontSize: 14,
          }}
        >
          <strong>Paciente:</strong> {datosPaciente.nombre || "-"}
          <br />
          <strong>RUT:</strong> {datosPaciente.rut || "-"}
          <br />
          {datosPaciente.edad && (
            <>
              <strong>Edad:</strong> {datosPaciente.edad} años
              <br />
            </>
          )}
          {datosPaciente.dolor && (
            <>
              <strong>Motivo / Dolor:</strong> {datosPaciente.dolor}
            </>
          )}
        </section>
      )}

      {/* Botón Flow */}
      <button
        type="button"
        onClick={handleFlow}
        disabled={loading !== null}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid var(--border, #e0e0e0)",
          boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))",
          background:
            loading === "flow"
              ? "var(--primary-soft, #e0f0ff)"
              : "var(--primary, #0066ff)",
          color: "var(--onPrimary, #ffffff)",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        {loading === "flow" ? "Redirigiendo a Flow..." : "Pagar con Flow (tarjeta / débito)"}
      </button>

      {/* Botón Khipu */}
      <button
        type="button"
        onClick={handleKhipu}
        disabled={loading !== null}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid var(--border, #e0e0e0)",
          boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))",
          background:
            loading === "khipu"
              ? "var(--accent-soft, #f0f5ff)"
              : "var(--accent, #00a39a)",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        {loading === "khipu"
          ? "Redirigiendo a Khipu..."
          : "Pagar con Khipu (transferencia)"}
      </button>

      {/* Botón volver */}
      {typeof onVolver === "function" && (
        <button
          type="button"
          onClick={() => onVolver()}
          disabled={loading !== null}
          style={{
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: "var(--muted-foreground, #666)",
            fontSize: 13,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          ⬅ Volver
        </button>
      )}
    </div>
  );
}
