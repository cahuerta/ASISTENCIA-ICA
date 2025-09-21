// src/EsquemaAnterior.jsx
import React from "react";
import cuerpoFrontal from "./assets/cuerpoFrontal.png";
import { getTheme } from "./theme.js";

const T = getTheme();

/**
 * Esquema anterior (híbrido): imagen base + hotspots SVG.
 * - Caderas y Rodillas (existentes) se mantienen EXACTAMENTE igual.
 * - Se agregan: HOMBRO, CODO, MANO, TOBILLO.
 * Nota: IZQUIERDA de pantalla = DERECHA del paciente.
 */
export default function EsquemaAnterior({
  onSeleccionZona,
  width = 400, // mismo ancho que el formulario
  className = "",
  baseSrc = cuerpoFrontal,
}) {
  const handle = (z) =>
    typeof onSeleccionZona === "function" && onSeleccionZona(z);

  const VB = 1024; // base 1024x1024

  // ===== Puntos =====
  // Caderas/Rodillas: SIN CAMBIOS (idénticos a los originales)
  // Nuevos puntos (Hombro, Codo, Mano, Tobillo) con tamaños solicitados:
  // - Hombro = rodilla (44,44)
  // - Codo más chico (38,38)
  // - Mano más chica que codo (32,32)
  // - Tobillo = codo (38,38)
  const puntos = {
    // En pantalla IZQUIERDA => DERECHA del paciente
    pantallaIzq_cadera: { cx: VB * 0.43, cy: VB * 0.48, rx: 48, ry: 40 },
    pantallaDer_cadera: { cx: VB * 0.57, cy: VB * 0.48, rx: 48, ry: 40 },

    // Rodillas (ajustadas previamente) — se mantienen
    pantallaIzq_rodilla: { cx: VB * 0.42, cy: VB * 0.75, rx: 44, ry: 44 },
    pantallaDer_rodilla: { cx: VB * 0.58, cy: VB * 0.75, rx: 44, ry: 44 },

    // ===== Nuevos =====
    // Hombros (igual a rodilla)
    pantallaIzq_hombro: { cx: VB * 0.36, cy: VB * 0.23, rx: 44, ry: 44 },
    pantallaDer_hombro: { cx: VB * 0.64, cy: VB * 0.23, rx: 44, ry: 44 },

    // Codos (más chico que hombro)
    pantallaIzq_codo: { cx: VB * 0.30, cy: VB * 0.43, rx: 38, ry: 38 },
    pantallaDer_codo: { cx: VB * 0.70, cy: VB * 0.43, rx: 38, ry: 38 },

    // Manos (más chicas que codo)
    pantallaIzq_mano: { cx: VB * 0.26, cy: VB * 0.62, rx: 32, ry: 32 },
    pantallaDer_mano: { cx: VB * 0.74, cy: VB * 0.62, rx: 32, ry: 32 },

    // Tobillos (igual a codo)
    pantallaIzq_tobillo: { cx: VB * 0.46, cy: VB * 0.95, rx: 38, ry: 38 },
    pantallaDer_tobillo: { cx: VB * 0.54, cy: VB * 0.95, rx: 38, ry: 38 },
  };

  const onKey = (z) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handle(z);
    }
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: typeof width === "number" ? `${width}px` : width,
        maxWidth: "100%",
        display: "inline-block",
        lineHeight: 0,
      }}
      aria-label="Esquema humano anterior"
    >
      <img
        src={baseSrc}
        alt="Cuerpo humano frontal"
        style={{ width: "100%", height: "auto", display: "block" }}
        draggable={false}
      />

      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="false"
        role="img"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <style>{`
            .hit {
              fill: ${T.primary ?? "#2f6bd8"};
              opacity: .18;
              transition: opacity .15s ease;
              pointer-events: auto;
              cursor: pointer;
            }
            .hit:hover, .hit:focus { opacity: .30; outline: none; }
          `}</style>
        </defs>

        {/* ===== CADERAS (pantalla IZQUIERDA = DERECHA del paciente) ===== */}
        <ellipse
          className="hit"
          cx={puntos.pantallaIzq_cadera.cx}
          cy={puntos.pantallaIzq_cadera.cy}
          rx={puntos.pantallaIzq_cadera.rx}
          ry={puntos.pantallaIzq_cadera.ry}
          tabIndex={0}
          role="button"
          aria-label="Cadera derecha (inguinal)"
          onClick={() => handle("Cadera derecha")}
          onKeyDown={onKey("Cadera derecha")}
        >
          <title>Cadera derecha (inguinal)</title>
        </ellipse>

        {/* CADERA (pantalla DERECHA = IZQUIERDA del paciente) */}
        <ellipse
          className="hit"
          cx={puntos.pantallaDer_cadera.cx}
          cy={puntos.pantallaDer_cadera.cy}
          rx={puntos.pantallaDer_cadera.rx}
          ry={puntos.pantallaDer_cadera.ry}
          tabIndex={0}
          role="button"
          aria-label="Cadera izquierda (inguinal)"
          onClick={() => handle("Cadera izquierda")}
          onKeyDown={onKey("Cadera izquierda")}
        >
          <title>Cadera izquierda (inguinal)</title>
        </ellipse>

        {/* ===== RODILLAS ===== */}
        {/* pantalla IZQUIERDA = DERECHA del paciente */}
        <ellipse
          className="hit"
          cx={puntos.pantallaIzq_rodilla.cx}
          cy={puntos.pantallaIzq_rodilla.cy}
          rx={puntos.pantallaIzq_rodilla.rx}
          ry={puntos.pantallaIzq_rodilla.ry}
          tabIndex={0}
          role="button"
          aria-label="Rodilla derecha"
          onClick={() => handle("Rodilla derecha")}
          onKeyDown={onKey("Rodilla derecha")}
        >
          <title>Rodilla derecha</title>
        </ellipse>

        {/* pantalla DERECHA = IZQUIERDA del paciente */}
        <ellipse
          className="hit"
          cx={puntos.pantallaDer_rodilla.cx}
          cy={puntos.pantallaDer_rodilla.cy}
          rx={puntos.pantallaDer_rodilla.rx}
          ry={puntos.pantallaDer_rodilla.ry}
          tabIndex={0}
          role="button"
          aria-label="Rodilla izquierda"
          onClick={() => handle("Rodilla izquierda")}
          onKeyDown={onKey("Rodilla izquierda")}
        >
          <title>Rodilla izquierda</title>
        </ellipse>

        {/* ===== HOMBROS (nuevo) ===== */}
        {/* pantalla IZQUIERDA = DERECHA del paciente */}
        <ellipse
          className="hit"
          cx={puntos.pantallaIzq_hombro.cx}
          cy={puntos.pantallaIzq_hombro.cy}
          rx={puntos.pantallaIzq_hombro.rx}
          ry={puntos.pantallaIzq_hombro.ry}
          tabIndex={0}
          role="button"
          aria-label="Hombro derecho"
          onClick={() => handle("Hombro derecho")}
          onKeyDown={onKey("Hombro derecho")}
        >
          <title>Hombro derecho</title>
        </ellipse>

        {/* pantalla DERECHA = IZQUIERDA del paciente */}
        <ellipse
          className="hit"
          cx={puntos.pantallaDer_hombro.cx}
          cy={puntos.pantallaDer_hombro.cy}
          rx={puntos.pantallaDer_hombro.rx}
          ry={puntos.pantallaDer_hombro.ry}
          tabIndex={0}
          role="button"
          aria-label="Hombro izquierdo"
          onClick={() => handle("Hombro izquierdo")}
          onKeyDown={onKey("Hombro izquierdo")}
        >
          <title>Hombro izquierdo</title>
        </ellipse>

        {/* ===== CODOS (nuevo) ===== */}
        <ellipse
          className="hit"
          cx={puntos.pantallaIzq_codo.cx}
          cy={puntos.pantallaIzq_codo.cy}
          rx={puntos.pantallaIzq_codo.rx}
          ry={puntos.pantallaIzq_codo.ry}
          tabIndex={0}
          role="button"
          aria-label="Codo derecho"
          onClick={() => handle("Codo derecho")}
          onKeyDown={onKey("Codo derecho")}
        >
          <title>Codo derecho</title>
        </ellipse>

        <ellipse
          className="hit"
          cx={puntos.pantallaDer_codo.cx}
          cy={puntos.pantallaDer_codo.cy}
          rx={puntos.pantallaDer_codo.rx}
          ry={puntos.pantallaDer_codo.ry}
          tabIndex={0}
          role="button"
          aria-label="Codo izquierdo"
          on
