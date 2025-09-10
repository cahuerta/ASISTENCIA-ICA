// src/EsquemaAnterior.jsx
import React from "react";
import cuerpoFrontal from "./assets/cuerpoFrontal.png";

/**
 * Esquema anterior (híbrido): imagen base + hotspots SVG.
 * Ajuste: caderas y rodillas más LATERALES (estaban muy juntas).
 * Recuerda: IZQUIERDA de pantalla = DERECHA del paciente.
 */
export default function EsquemaAnterior({
  onSeleccionZona,
  width = 400,  // igual al ancho del formulario
  className = "",
  baseSrc = cuerpoFrontal,
}) {
  const handle = (z) =>
    typeof onSeleccionZona === "function" && onSeleccionZona(z);

  const VB = 1024; // imagen base 1024x1024

  // Más separación lateral:
  // Caderas: de 0.45/0.55 -> 0.43/0.57  (y = 0.48)
  // Rodillas: de 0.46/0.54 -> 0.44/0.56 (y = 0.77)
  const puntos = {
    // En pantalla IZQUIERDA => DERECHA del paciente
    pantallaIzq_cadera:  { cx: VB * 0.43, cy: VB * 0.48, rx: 48, ry: 40 },
    pantallaDer_cadera:  { cx: VB * 0.57, cy: VB * 0.48, rx: 48, ry: 40 },
    pantallaIzq_rodilla: { cx: VB * 0.44, cy: VB * 0.77, rx: 44, ry: 44 },
    pantallaDer_rodilla: { cx: VB * 0.56, cy: VB * 0.77, rx: 44, ry: 44 },
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
      {/* Imagen base (fondo) */}
      <img
        src={baseSrc}
        alt="Cuerpo humano frontal"
        style={{ width: "100%", height: "auto", display: "block" }}
        draggable={false}
      />

      {/* Capa SVG interactiva */}
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
              fill: #2f6bd8;
              opacity: .18;
              transition: opacity .15s ease;
              pointer-events: auto;
              cursor: pointer;
            }
            .hit:hover, .hit:focus { opacity: .30; outline: none; }
          `}</style>
        </defs>

        {/* En pantalla IZQUIERDA = DERECHA del paciente */}
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

        {/* En pantalla DERECHA = IZQUIERDA del paciente */}
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

        {/* Rodilla – pantalla IZQUIERDA = DERECHA del paciente */}
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

        {/* Rodilla – pantalla DERECHA = IZQUIERDA del paciente */}
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
      </svg>
    </div>
  );
}
