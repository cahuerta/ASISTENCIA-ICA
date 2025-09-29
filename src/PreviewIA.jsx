"use client";
import React, { useEffect, useMemo, useState } from "react";

/**
 * PreviewIA — SEGUNDO PREVIEW (post IA)
 * Muestra:
 *  - Datos del paciente (nombre / RUT)
 *  - Exámenes sugeridos por IA
 *  - Observaciones (si existen)
 *  - Botón "Pagar ahora"
 *
 * Props:
 *  - scope: "preop" | "generales" | "ia" (define claves de sessionStorage)
 *  - datos: { nombre, rut, ... }
 *  - iaResultado?: { examenes?: string[], observaciones?: string }
 *  - onPagar?: () => void
 *  - seccionesExtra?: [{ title, lines: string[] }]
 */
export default function PreviewIA({
  scope = "preop",
  datos = {},
  iaResultado,
  onPagar,
  seccionesExtra = [],
}) {
  const { nombre = "", rut = "" } = datos || {};

  // Claves por scope (compat con tu app)
  const keyExams =
    scope === "generales" ? "generales_ia_examenes" : "preop_ia_examenes";
  const keyInfo =
    scope === "generales" ? "generales_ia_resumen" : "preop_ia_resumen";

  // Estado local (si no viene iaResultado por props, lo cargamos de sessionStorage)
  const [examenes, setExamenes] = useState(
    Array.isArray(iaResultado?.examenes) ? iaResultado.examenes : []
  );
  const [observaciones, setObservaciones] = useState(
    iaResultado?.observaciones || ""
  );

  useEffect(() => {
    if (iaResultado) return; // Si ya llegó por props, no leemos storage
    try {
      const r1 = sessionStorage.getItem(keyExams);
      const r2 = sessionStorage.getItem(keyInfo) || "";
      setExamenes(r1 ? JSON.parse(r1) : []);
      setObservaciones(r2 || "");
    } catch {
      setExamenes([]);
      setObservaciones("");
    }
  }, [iaResultado, keyExams, keyInfo]);

  return (
    <div className="card">
      <div className="center">
        <h2 className="h1" style={{ margin: 0, color: "var(--primary)" }}>
          Instituto de Cirugía Articular
        </h2>
      </div>

      <h3 className="h1 center" style={{ marginTop: 12 }}>
        Vista previa — Exámenes (IA)
      </h3>

      {/* Datos mínimos del paciente */}
      <div className="mt-12">
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          <strong>Paciente:</strong> {nombre || "—"}
        </p>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          <strong>RUT:</strong> {rut || "—"}
        </p>
      </div>

      {/* Exámenes sugeridos por IA */}
      <div className="card mt-12" style={{ padding: 14 }}>
        <strong style={{ display: "block", color: "var(--primary)", marginBottom: 6 }}>
          Exámenes sugeridos:
        </strong>
        {Array.isArray(examenes) && examenes.length > 0 ? (
          <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 20 }}>
            {examenes.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : (
          <p style={{ marginTop: 6, color: "var(--text-muted)" }}>—</p>
        )}
      </div>

      {/* Observaciones IA (opcional) */}
      {observaciones ? (
        <div
          className="mt-12"
          style={{
            fontSize: 14,
            background: "var(--accent-alpha)",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-line",
            border: `1px solid var(--border)`,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Observaciones:</div>
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{observaciones}</p>
        </div>
      ) : null}

      {/* Secciones extra opcionales */}
      {Array.isArray(seccionesExtra) &&
        seccionesExtra.map((sec, idx) => (
          <div key={idx} className="card mt-12" style={{ padding: 14 }}>
            <strong style={{ display: "block", color: "var(--primary)", marginBottom: 6 }}>
              {sec.title}
            </strong>
            {Array.isArray(sec.lines) && sec.lines.length > 0 ? (
              <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 20 }}>
                {sec.lines.map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
            ) : (
              <p style={{ marginTop: 6 }}>—</p>
            )}
          </div>
        ))}

      {/* Botón de pago: solo en segundo preview */}
      <button
        type="button"
        className="btn fullw mt-16"
        onClick={() => {
          if (typeof onPagar === "function") onPagar();
          else alert("Conecta el callback onPagar desde App.jsx");
        }}
      >
        Pagar ahora
      </button>

      <div className="center" style={{ marginTop: 20, flexDirection: "column" }}>
        <hr style={{ width: "60%", margin: "20px auto", borderColor: "var(--border)" }} />
        <p style={{ textAlign: "center", margin: 0, color: "var(--text-muted)" }}>
          Firma médico tratante
        </p>
      </div>
    </div>
  );
}
