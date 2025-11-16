// src/screens/PantallaTres.jsx
"use client";

import React, { useState, useEffect } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { irAPagoFlow } from "../PagoFlow.jsx";

/**
 * Lee desde sessionStorage un pequeño resumen de la orden
 * según el módulo actual (trauma / preop / generales / ia).
 */
function buildPreviewOrden() {
  if (typeof window === "undefined") return null;

  let modulo = "trauma";
  try {
    modulo = (sessionStorage.getItem("modulo") || "trauma").toLowerCase();
  } catch {
    modulo = "trauma";
  }

  if (!["trauma", "preop", "generales", "ia"].includes(modulo)) {
    modulo = "trauma";
  }

  // === GENERALES ===
  if (modulo === "generales") {
    let examenes = [];
    try {
      const raw = sessionStorage.getItem("generales_ia_examenes");
      if (raw) examenes = JSON.parse(raw);
    } catch {}
    const resumen = sessionStorage.getItem("generales_ia_resumen") || "";

    return {
      modulo,
      titulo: "Revisión general — exámenes sugeridos",
      lineas: Array.isArray(examenes) ? examenes : [],
      extra: resumen,
    };
  }

  // === PREOP ===
  if (modulo === "preop") {
    let examenes = [];
    try {
      const raw = sessionStorage.getItem("preop_ia_examenes");
      if (raw) examenes = JSON.parse(raw);
    } catch {}
    const resumen = sessionStorage.getItem("preop_ia_resumen") || "";

    return {
      modulo,
      titulo: "Exámenes prequirúrgicos — propuesta IA",
      lineas: Array.isArray(examenes) ? examenes : [],
      extra: resumen,
    };
  }

  // === TRAUMA / IA (orden de imagenología) ===
  let examenes = [];
  try {
    const raw = sessionStorage.getItem("trauma_ia_examenes");
    if (raw) examenes = JSON.parse(raw);
  } catch {}
  const diag = sessionStorage.getItem("trauma_ia_diagnostico") || "";
  const just = sessionStorage.getItem("trauma_ia_justificacion") || "";

  return {
    modulo,
    titulo: "Orden de imagenología",
    lineas: Array.isArray(examenes) ? examenes : [],
    extra: diag || just || "",
  };
}

export default function PantallaTres({ datosPaciente, onVolver }) {
  const [loading, setLoading] = useState(null); // "flow" | "khipu" | null
  const [preview, setPreview] = useState(null);

  // Cargar mini preview al montar la pantalla
  useEffect(() => {
    try {
      const p = buildPreviewOrden();
      setPreview(p);
    } catch {
      setPreview(null);
    }
  }, []);

  const handleFlow = async () => {
    try {
      setLoading("flow");
      await irAPagoFlow(datosPaciente);
      // irAPagoFlow se encarga de redirigir
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

      {/* MINI “IMAGEN” TIPO PDF BORROSO */}
      {preview && (
        <section
          style={{
            borderRadius: 12,
            padding: 12,
            border: "1px solid var(--border, #e0e0e0)",
            background: "#ffffff",
            fontSize: 13,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 6,
              color: "var(--muted-foreground, #555)",
            }}
          >
            Vista previa de la orden
            {preview.modulo === "generales"
              ? " (Revisión general)"
              : preview.modulo === "preop"
              ? " (Preoperatorio)"
              : " (Trauma / IA)"}
          </div>

          {/* “Thumbnail” simulado del PDF */}
          <div
            style={{
              position: "relative",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#fdfdfd",
              padding: 10,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              overflow: "hidden",
              minHeight: 140,
            }}
          >
            {/* Cabecera tipo PDF */}
            <div
              style={{
                height: 16,
                borderRadius: 4,
                background: "rgba(0,0,0,0.06)",
                marginBottom: 8,
                width: "60%",
              }}
            />
            {/* Línea de datos paciente */}
            <div
              style={{
                height: 10,
                borderRadius: 4,
                background: "rgba(0,0,0,0.04)",
                marginBottom: 4,
                width: "80%",
              }}
            />
            {/* Línea de RUT */}
            <div
              style={{
                height: 10,
                borderRadius: 4,
                background: "rgba(0,0,0,0.04)",
                marginBottom: 10,
                width: "70%",
              }}
            />

            {/* Algunas líneas de texto simulando los exámenes */}
            {preview.lineas && preview.lineas.length > 0 ? (
              preview.lineas.slice(0, 4).map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    height: 10,
                    borderRadius: 4,
                    background: "rgba(0,0,0,0.03)",
                    marginBottom: 4,
                    width: `${70 - idx * 8}%`,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    fontSize: 9,
                    paddingLeft: 4,
                    color: "rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  • {line}
                </div>
              ))
            ) : preview.extra ? (
              <div
                style={{
                  height: 48,
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.02)",
                  fontSize: 9,
                  padding: 4,
                  color: "rgba(0,0,0,0.45)",
                  overflow: "hidden",
                }}
              >
                {preview.extra}
              </div>
            ) : (
              <div
                style={{
                  height: 40,
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.02)",
                  fontSize: 9,
                  padding: 4,
                  color: "rgba(0,0,0,0.35)",
                }}
              >
                Sin contenido aún. Complete la información en el módulo anterior.
              </div>
            )}

            {/* Capa “borrosa”/velada encima */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.9))",
                backdropFilter: "blur(2px)", // algunos navegadores lo soportan
                pointerEvents: "none",
              }}
            />

            {/* Etiqueta en la esquina */}
            <div
              style={{
                position: "absolute",
                bottom: 6,
                right: 8,
                fontSize: 10,
                color: "rgba(0,0,0,0.55)",
                background: "rgba(255,255,255,0.8)",
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              Vista referencial del PDF
            </div>
          </div>
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
        {loading === "flow"
          ? "Redirigiendo a Flow..."
          : "Pagar con Flow (tarjeta / débito)"}
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
