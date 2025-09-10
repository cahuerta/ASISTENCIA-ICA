// src/EsquemaPosterior.jsx
import React from "react";
import cuerpoPosterior from "./assets/cuerpoPosterior.png";

export default function EsquemaPosterior({
  onSeleccionZona,
  width = 400,
  className = "",
  baseSrc = cuerpoPosterior,
}) {
  const handle = (z) =>
    typeof onSeleccionZona === "function" && onSeleccionZona(z);
  const onKey = (z) => (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handle(z); }
  };

  const VB = 1024;

  const puntos = {
    caderaIzq: { cx: VB * 0.43, cy: VB * 0.50, rx: 50, ry: 40, label: "Cadera izquierda" },
    caderaDer: { cx: VB * 0.57, cy: VB * 0.50, rx: 50, ry: 40, label: "Cadera derecha" },

    // Rodillas: más laterales y un poco más arriba
    rodillaIzq: { cx: VB * 0.41, cy: VB * 0.75, rx: 46, ry: 46, label: "Rodilla izquierda (posterior)" },
    rodillaDer: { cx: VB * 0.59, cy: VB * 0.75, rx: 46, ry: 46, label: "Rodilla derecha (posterior)" },

    // Lumbar se mantiene sobre pelvis
    lumbar: { x: VB * 0.5 - 42, y: VB * 0.36, w: 84, h: 110, rx: 12, label: "Columna lumbar" },
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
      <img
        src={baseSrc}
        alt="Cuerpo humano posterior"
        style={{ width: "100%", height: "auto", display: "block" }}
        draggable={false}
      />

      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="false"
        role="img"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          <style>{`
            .hit{ fill:#2f6bd8; opacity:.18; transition:opacity .15s ease; pointer-events:auto; cursor:pointer; }
            .hit:hover, .hit:focus{ opacity:.30; outline:none; }
            .spine{ stroke:#8c8c8c; stroke-width:8; stroke-dasharray:18 14; stroke-linecap:round; fill:none; opacity:.55; pointer-events:none; }
          `}</style>
        </defs>

        {/* Columna: parte más arriba, termina igual */}
        <line className="spine" x1={VB*0.5} y1={VB*0.08} x2={VB*0.5} y2={VB*0.47} />

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
