// src/EsquemaAnterior.jsx
import React from "react";
import cuerpoFrontal from "./assets/cuerpoFrontal.png";

/**
 * Esquema anterior (híbrido): imagen base + hotspots SVG.
 * Hotspots: Cadera (zona inguinal) izquierda/derecha y Rodilla izquierda/derecha.
 *
 * Props:
 * - onSeleccionZona(z: string): callback al hacer click/enter/space en una zona
 * - width (number|string): ancho del contenedor (ej. 320, "100%")
 * - className (string): clases extra para el contenedor
 * - baseSrc (string): opcional, para usar otra imagen base
 */
export default function EsquemaAnterior({
  onSeleccionZona,
  width = 320,
  className = "",
  baseSrc = cuerpoFrontal,
}) {
  const handle = (z) =>
    typeof onSeleccionZona === "function" && onSeleccionZona(z);

  // Usamos un viewBox cuadrado pensado para la imagen generada (1024x1024).
  // Las posiciones son relativas a ese sistema; así se adaptan a cualquier tamaño mostrado.
  const VB = 1024;

  // Coordenadas aproximadas centradas en anatomía frontal del maniquí
  // (afinables después a tu preferencia visual)
  const puntos = {
    caderaIzq: { cx: VB * 0.41, cy: VB * 0.44, rx: 48, ry: 38, label: "Cadera izquierda (inguinal)" },
    caderaDer: { cx: VB * 0.59, cy: VB * 0.44, rx: 48, ry: 38, label: "Cadera derecha (inguinal)" },
    rodillaIzq: { cx: VB * 0.41, cy: VB * 0.73, rx: 44, ry: 44, label: "Rodilla izquierda" },
    rodillaDer: { cx: VB * 0.59, cy: VB * 0.73, rx: 44, ry: 44, label: "Rodilla derecha" },
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
          pointerEvents: "none", // evitamos capturar scroll/drag fuera de hotspots
        }}
      >
        <defs>
          <style>{`
            .hit {
              fill: #2f6bd8;
              opacity: .18;
              transition: opacity .15s ease;
              pointer-events: auto;      /* reactivamos eventos solo en el hotspot */
              cursor: pointer;
            }
            .hit:hover, .hit:focus {
              opacity: .30;
              outline: none;
            }
          `}</style>
        </defs>

        {/* Cadera izquierda (zona inguinal) */}
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

        {/* Cadera derecha (zona inguinal) */}
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
