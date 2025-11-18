// src/screens/PantallaTres.jsx
"use client";

import React, { useState, useEffect } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { irAPagoFlow } from "../PagoFlow.jsx";
import logoICA from "../assets/ica.jpg";

/* ====== GUEST (misma lógica que en PagoKhipu.jsx) ====== */
const GUEST_PERFIL = {
  nombre: "Guest",
  rut: "11.111.111-1",
};

function normRut(str) {
  return String(str || "").replace(/[^0-9kK]/g, "").toUpperCase();
}

function esGuest(datos) {
  const nombreOk = String(datos?.nombre || "").trim().toLowerCase() === "guest";
  const rutOk = normRut(datos?.rut) === normRut(GUEST_PERFIL.rut);
  return nombreOk && rutOk;
}

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
    const extraLibre = sessionStorage.getItem("generales_examen_libre") || "";

    const lineas = Array.isArray(examenes) ? examenes : [];
    if (extraLibre.trim()) lineas.push(extraLibre.trim());

    return {
      modulo,
      titulo: "Revisión general — exámenes sugeridos",
      lineas,
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

  // === IA texto libre (si existiera) ===
  if (modulo === "ia") {
    const txt = sessionStorage.getItem("previewIA") || "";
    const lineas = txt
      ? txt
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return {
      modulo,
      titulo: "Orden generada por IA",
      lineas,
      extra: "",
    };
  }

  // === TRAUMA (orden de imagenología) ===
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

  // NUEVO: detectar si este paciente es "Guest"
  const isGuest = esGuest(datosPaciente || {});

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
      // irAPagoKhipu también redirige (y ya maneja modoGuest internamente)
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

      {/* MINI “PDF” */}
      {preview && (
        <section
          style={{
            borderRadius: 12,
            padding: 12,
            border: "1px solid var(--border, #e0e0e0)",
            background: "#ffffff",
            fontSize: 11,
          }}
        >
          <div
            style={{
              fontSize: 11,
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
              : preview.modulo === "ia"
              ? " (IA)"
              : " (Trauma)"}
          </div>

          {/* Hoja tipo PDF, pequeña */}
          <div
            style={{
              position: "relative",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#fdfdfd",
              padding: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              overflow: "hidden",
              height: 190, // pequeño
            }}
          >
            {/* Header: logo + texto */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  overflow: "hidden",
                  marginRight: 6,
                  flexShrink: 0,
                }}
              >
                <img
                  src={logoICA}
                  alt="ICA"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 9, fontWeight: 700 }}>
                  INSTITUTO DE CIRUGÍA ARTICULAR
                </div>
                <div style={{ fontSize: 8, color: "#666" }}>
                  {preview.titulo || "Orden médica"}
                </div>
              </div>
            </div>

            {/* Datos paciente, letra pequeña */}
            <div style={{ fontSize: 8, marginBottom: 6, color: "#333" }}>
              <div>
                <strong>Paciente:</strong>{" "}
                {datosPaciente?.nombre || "________________"}
              </div>
              <div>
                <strong>RUT:</strong>{" "}
                {datosPaciente?.rut || "________________"}
              </div>
              <div>
                <strong>Edad:</strong>{" "}
                {datosPaciente?.edad ? `${datosPaciente.edad} años` : "____"}
              </div>
            </div>

            {/* Lista de exámenes */}
            <div style={{ fontSize: 8 }}>
              <strong>Exámenes solicitados:</strong>
              <ul
                style={{
                  marginTop: 2,
                  paddingLeft: 12,
                  maxHeight: 90,
                  overflow: "hidden",
                }}
              >
                {preview.lineas && preview.lineas.length > 0 ? (
                  preview.lineas.slice(0, 6).map((line, idx) => (
                    <li key={`${idx}-${line.slice(0, 12)}`}>{line}</li>
                  ))
                ) : preview.extra ? (
                  <li>{preview.extra}</li>
                ) : (
                  <li style={{ fontStyle: "italic", color: "#999" }}>
                    Sin exámenes registrados aún.
                  </li>
                )}
              </ul>
            </div>

            {/* Watermark PREVIEW */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                opacity: 0.18,
                transform: "rotate(-20deg)",
                fontSize: 18,
                fontWeight: 700,
                color: "#999",
              }}
            >
              PREVIEW SIN VALOR
            </div>

            {/* Etiqueta esquina */}
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 6,
                fontSize: 9,
                color: "rgba(0,0,0,0.6)",
                background: "rgba(255,255,255,0.9)",
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

      {/* Botones de pago / guest */}
      {isGuest ? (
        // MODO GUEST: usamos el mismo flujo de Khipu, que internamente respeta modoGuest
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
            ? "Redirigiendo..."
            : "Continuar (modo invitado)"}
        </button>
      ) : (
        <>
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
        </>
      )}

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
