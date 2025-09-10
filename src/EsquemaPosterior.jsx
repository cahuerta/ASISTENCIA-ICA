// src/EsquemaPosterior.jsx
import React from "react";
import cuerpoPosterior from "./assets/cuerpoPosterior.png";

/**
 * Esquema posterior (híbrido): imagen base + hotspots SVG.
 * Hotspots: Columna lumbar (clickeable), Cadera izq/der y Rodilla izq/der.
 *
 * Props:
 * - onSeleccionZona(z: string)
 * - width: ancho del contenedor (ej. 320 o "100%")
 * - className: clases extra
 * - baseSrc: para reemplazar la imagen base si se requiere
 */
export default function EsquemaPosterior({
  onSeleccionZona,
  width = 320,
  className = "",
  baseSrc = cuerpoPosterior,
}) {
  const handle = (z) =>
    typeof onSeleccionZona === "function" && onSeleccionZona(z);

  const onKey = (z) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handle(z);
    }
  };

  // Usamos el mismo sistema de coordenadas que en el frontal (imagen 1024x1024)
  const VB = 1024;

  // Coordenadas aproximadas para vista posterior del maniquí
  const puntos = {
    // Centro de la pelvis (para referencia)
    pelvisY: VB * 0.46,

    // Caderas (aprox. sobre trocánteres; “zona glútea/huéspedes posteriores” no clickeable extra por ahora)
    caderaIzq: { cx: VB * 0.41, cy: VB * 0.46, rx: 50, ry: 40, label: "Cadera izquierda" },
    caderaDer: { cx: VB * 0.59, cy: VB * 0.46, rx: 50, ry: 40, label: "Cadera derecha" },

    // Rodillas (fosas poplíteas aprox.)
    rodillaIzq: { cx: VB * 0.41, cy: VB * 0.73, rx: 44, ry: 44, label: "Rodilla izquierda (posterior)" },
    rodillaDer: { cx: VB * 0.59, cy: VB * 0.73, rx: 44, ry: 44, label: "Rodilla derecha (posterior)" },

    // Columna lumbar: rectángulo centrado en L1–L5 (ligeramente por debajo de la línea de costillas)
    lumbar: {
      x: VB * 0.5 - 40,
      y: VB * 0.48,
      w: 80,
      h: 140,
      rx: 10,
      label: "Columna lumbar",
    },
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
      aria-label="Esquema humano posterior"
    >
      {/* Imagen base (fondo) */}
      <img
        src={baseSrc}
        alt="Cuerpo humano posterior"
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

            .spine {
              stroke: #8c8c8c;
              stroke-width: 8;
              stroke-dasharray: 18 14;
              stroke-linecap: round;
              fill: none;
              opacity: .55;
              pointer-events: none;
            }
          `}</style>
        </defs>

        {/* Columna (línea punteada solo como referencia visual) */}
        <line
          className="spine"
          x1={VB * 0.5}
          y1={VB * 0.16}
          x2={VB * 0.5}
          y2={VB * 0.74}
        />

        {/* Zona clickeable: Columna lumbar */}
        <rect
          className="hit"
          x={puntos.lumbar.x}
          y={puntos.lumbar.y}
          width={puntos.lumbar.w}
          height={puntos.lumbar.h}
          rx={puntos.lumbar.rx}
          tabIndex={0}
          role="button"
          aria-label={puntos.lumbar.label}
          onClick={() => handle("Columna lumbar")}
          onKeyDown={onKey("Columna lumbar")}
        >
          <title>{puntos.lumbar.label}</title>
        </rect>

        {/* Cadera izquierda */}
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

        {/* Cadera derecha */}
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

        {/* Rodilla izquierda (posterior) */}
        <ellipse
          className="hit"
          cx={puntos.rodillaIzq.cx}
          cy={puntos.rodillaIzq.cy}
          rx={puntos.rodillaIzq.rx}
          ry={puntos.rodillaIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={puntos.rodillaIzq.label}
          onClick={() => handle("Rodilla izquierda (posterior)")}
          onKeyDown={onKey("Rodilla izquierda (posterior)")}
        >
          <title>{puntos.rodillaIzq.label}</title>
        </ellipse>

        {/* Rodilla derecha (posterior) */}
        <ellipse
          className="hit"
          cx={puntos.rodillaDer.cx}
          cy={puntos.rodillaDer.cy}
          rx={puntos.rodillaDer.rx}
          ry={puntos.rodillaDer.ry}
          tabIndex={0}
          role="button"
          aria-label={puntos.rodillaDer.label}
          onClick={() => handle("Rodilla derecha (posterior)")}
          onKeyDown={onKey("Rodilla derecha (posterior)")}
        >
          <title>{puntos.rodillaDer.label}</title>
        </ellipse>
      </svg>
    </div>
  );
}
