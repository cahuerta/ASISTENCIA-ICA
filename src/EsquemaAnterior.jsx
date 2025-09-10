// src/EsquemaAnterior.jsx
import React from "react";
import cuerpoFrontal from "./assets/cuerpoFrontal.png";

/**
 * Esquema anterior (híbrido): imagen base + hotspots SVG.
 * Ajustes solicitados:
 * - Caderas: más bajas y medializadas.
 * - Rodillas: más bajas y medializadas.
 */
export default function EsquemaAnterior({
  onSeleccionZona,
  width = 380,            // Dibujo más grande (puedes subir a 400 si quieres)
  className = "",
  baseSrc = cuerpoFrontal,
}) {
  const handle = (z) =>
    typeof onSeleccionZona === "function" && onSeleccionZona(z);

  const VB = 1024; // imagen base 1024x1024

  // === COORDENADAS AJUSTADAS ===
  // Caderas: antes (cx 0.41/0.59, cy 0.44) → ahora más medial (0.45/0.55) y más bajas (0.48).
  // Rodillas: antes (cx 0.41/0.59, cy 0.73) → ahora más medial (0.46/0.54) y más bajas (0.77).
  const puntos = {
    caderaIzq:   { cx: VB * 0.45, cy: VB * 0.48, rx: 50, ry: 40, label: "Cadera izquierda (inguinal)" },
    caderaDer:   { cx: VB * 0.55, cy: VB * 0.48, rx: 50, ry: 40, label: "Cadera derecha (inguinal)" },
    rodillaIzq:  { cx: VB * 0.46, cy: VB * 0.77, rx: 46, ry: 46, label: "Rodilla izquierda" },
    rodillaDer:  { cx: VB * 0.54, cy: VB * 0.77, rx: 46, ry: 46, label: "Rodilla derecha" },
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

        {/* Cadera izquierda (inguinal) */}
        <ellipse
          className="hit"
          cx={puntos.caderaIzq.cx}
          cy={puntos.caderaIzq.cy}
          rx={puntos.caderaIzq.rx}
          ry={puntos.caderaIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={puntos.caderaIzq.label}
          onClick={() => handle("Cadera izquierda")}
          onKeyDown={onKey("Cadera izquierda")}
        >
          <title>{puntos.caderaIzq.label}</title>
        </ellipse>

        {/* Cadera derecha (inguinal) */}
        <ellipse
          className="hit"
          cx={puntos.caderaDer.cx}
          cy={puntos.caderaDer.cy}
          rx={puntos.caderaDer.rx}
          ry={puntos.caderaDer.ry}
          tabIndex={0}
          role="button"
          aria-label={puntos.caderaDer.label}
          onClick={() => handle("Cadera derecha")}
          onKeyDown={onKey("Cadera derecha")}
        >
          <title>{puntos.caderaDer.label}</title>
        </ellipse>

        {/* Rodilla izquierda */}
        <ellipse
          className="hit"
          cx={puntos.rodillaIzq.cx}
          cy={puntos.rodillaIzq.cy}
          rx={puntos.rodillaIzq.rx}
          ry={puntos.rodillaIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={puntos.rodillaIzq.label}
          onClick={() => handle("Rodilla izquierda")}
          onKeyDown={onKey("Rodilla izquierda")}
        >
          <title>{puntos.rodillaIzq.label}</title>
        </ellipse>

        {/* Rodilla derecha */}
        <ellipse
          className="hit"
          cx={puntos.rodillaDer.cx}
          cy={puntos.rodillaDer.cy}
          rx={puntos.rodillaDer.rx}
          ry={puntos.rodillaDer.ry}
          tabIndex={0}
          role="button"
          aria-label={puntos.rodillaDer.label}
          onClick={() => handle("Rodilla derecha")}
          onKeyDown={onKey("Rodilla derecha")}
        >
          <title>{puntos.rodillaDer.label}</title>
        </ellipse>
      </svg>
    </div>
  );
}
