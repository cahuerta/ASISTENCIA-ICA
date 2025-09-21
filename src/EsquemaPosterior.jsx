// src/EsquemaPosterior.jsx
import React from "react";
import cuerpoPosterior from "./assets/cuerpoPosterior.png";
import { getTheme } from "./theme.js";

const T = getTheme();

export default function EsquemaPosterior({
  onSeleccionZona,
  width = 400,
  className = "",
  baseSrc = cuerpoPosterior,
}) {
  const handle = (z) => typeof onSeleccionZona === "function" && onSeleccionZona(z);
  const onKey = (z) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handle(z);
    }
  };

  const VB = 1024;

  // ===== Puntos existentes (NO MODIFICAR) =====
  const puntos = {
    caderaIzq: { cx: VB * 0.43, cy: VB * 0.50, rx: 50, ry: 40, label: "Cadera izquierda" },
    caderaDer: { cx: VB * 0.57, cy: VB * 0.50, rx: 50, ry: 40, label: "Cadera derecha" },
    rodillaIzq: { cx: VB * 0.42, cy: VB * 0.75, rx: 46, ry: 46, label: "Rodilla izquierda (posterior)" },
    rodillaDer: { cx: VB * 0.58, cy: VB * 0.75, rx: 46, ry: 46, label: "Rodilla derecha (posterior)" },
    lumbar:     { x: VB * 0.5 - 42, y: VB * 0.30, w: 84, h: 120, rx: 12, label: "Columna lumbar" },
  };

  // ===== Nuevos puntos (vista posterior: DERECHA = derecha en pantalla) =====
  // Tamaños acordados:
  // - Hombro = Rodilla (rx/ry ~ 44)
  // - Codo = Tobillo (rx/ry ~ 38)  [más chico que hombro]
  // - Mano más chico (rx/ry ~ 32)
  //
  // Posiciones ajustadas para vista posterior (puedes afinar si quieres calce perfecto con tu PNG):
  const nuevos = {
    // HOMBROS (ligeramente por debajo del trapecio)
    hombroIzq: { cx: VB * 0.35, cy: VB * 0.075, rx: 44, ry: 44, label: "Hombro izquierda" },
    hombroDer: { cx: VB * 0.65, cy: VB * 0.075, rx: 44, ry: 44, label: "Hombro derecha" },

    // CODOS (a la mitad del brazo)
    codoIzq:   { cx: VB * 0.31, cy: VB * 0.31, rx: 38, ry: 38, label: "Codo izquierda" },
    codoDer:   { cx: VB * 0.69, cy: VB * 0.31, rx: 38, ry: 38, label: "Codo derecha" },

    // MANOS (a la altura del muslo superior)
    manoIzq:   { cx: VB * 0.26, cy: VB * 0.495, rx: 32, ry: 32, label: "Mano izquierda" },
    manoDer:   { cx: VB * 0.74, cy: VB * 0.495, rx: 32, ry: 32, label: "Mano derecha" },

    // TOBILLOS (apenas por sobre el borde inferior)
    tobilloIzq:{ cx: VB * 0.41, cy: VB * 1.2, rx: 38, ry: 38, label: "Tobillo izquierda" },
    tobilloDer:{ cx: VB * 0.59, cy: VB * 1.2, rx: 38, ry: 38, label: "Tobillo derecha" },
  };

  // ===== Columnas adicionales (sin lado) =====
  // Mismo estilo que lumbar; ubicadas por encima de lumbar
  const cervical = { x: VB * 0.5 - 34, y: VB * 0.0001,  w: 68,  h: 65,  rx: 10, label: "Columna cervical" };
  const dorsal   = { x: VB * 0.5 - 40, y: VB * 0.07,  w: 80,  h: 125, rx: 12, label: "Columna dorsal" };

  const hitFill = T.primary ?? "#2f6bd8";
  const spineStroke = T.textMuted ?? "#8c8c8c";

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
      aria-label="Vista posterior"
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
            .hit{
              fill:${hitFill};
              opacity:.18;
              transition:opacity .15s ease;
              pointer-events:auto;
              cursor:pointer;
            }
            .hit:hover, .hit:focus{ opacity:.30; outline:none; }
            .spine{
              stroke:${spineStroke};
              stroke-width:8;
              stroke-dasharray:18 14;
              stroke-linecap:round;
              fill:none;
              opacity:.55;
              pointer-events:none;
            }
          `}</style>
        </defs>

        {/* Columna (línea guía punteada) */}
        <line className="spine" x1={VB*0.5} y1={VB*0.04} x2={VB*0.5} y2={VB*0.46} />

        {/* ===== Columnas sin lado ===== */}
        <rect
          className="hit"
          x={cervical.x} y={cervical.y}
          width={cervical.w} height={cervical.h} rx={cervical.rx}
          tabIndex={0} role="button" aria-label={cervical.label}
          onClick={() => handle("Columna cervical")}
          onKeyDown={onKey("Columna cervical")}
        />
        <rect
          className="hit"
          x={dorsal.x} y={dorsal.y}
          width={dorsal.w} height={dorsal.h} rx={dorsal.rx}
          tabIndex={0} role="button" aria-label={dorsal.label}
          onClick={() => handle("Columna dorsal")}
          onKeyDown={onKey("Columna dorsal")}
        />

        {/* ===== Lumbar (existente, igual) ===== */}
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
        />

        {/* ===== Caderas (existentes) ===== */}
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
        />
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
        />

        {/* ===== Rodillas (existentes) ===== */}
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
        />
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
        />

        {/* ===== Hombros (nuevos) ===== */}
        <ellipse
          className="hit"
          cx={nuevos.hombroIzq.cx}
          cy={nuevos.hombroIzq.cy}
          rx={nuevos.hombroIzq.rx}
          ry={nuevos.hombroIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.hombroIzq.label}
          onClick={() => handle("Hombro izquierda")}
          onKeyDown={onKey("Hombro izquierda")}
        />
        <ellipse
          className="hit"
          cx={nuevos.hombroDer.cx}
          cy={nuevos.hombroDer.cy}
          rx={nuevos.hombroDer.rx}
          ry={nuevos.hombroDer.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.hombroDer.label}
          onClick={() => handle("Hombro derecha")}
          onKeyDown={onKey("Hombro derecha")}
        />

        {/* ===== Codos (nuevos) ===== */}
        <ellipse
          className="hit"
          cx={nuevos.codoIzq.cx}
          cy={nuevos.codoIzq.cy}
          rx={nuevos.codoIzq.rx}
          ry={nuevos.codoIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.codoIzq.label}
          onClick={() => handle("Codo izquierda")}
          onKeyDown={onKey("Codo izquierda")}
        />
        <ellipse
          className="hit"
          cx={nuevos.codoDer.cx}
          cy={nuevos.codoDer.cy}
          rx={nuevos.codoDer.rx}
          ry={nuevos.codoDer.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.codoDer.label}
          onClick={() => handle("Codo derecha")}
          onKeyDown={onKey("Codo derecha")}
        />

        {/* ===== Manos (nuevos) ===== */}
        <ellipse
          className="hit"
          cx={nuevos.manoIzq.cx}
          cy={nuevos.manoIzq.cy}
          rx={nuevos.manoIzq.rx}
          ry={nuevos.manoIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.manoIzq.label}
          onClick={() => handle("Mano izquierda")}
          onKeyDown={onKey("Mano izquierda")}
        />
        <ellipse
          className="hit"
          cx={nuevos.manoDer.cx}
          cy={nuevos.manoDer.cy}
          rx={nuevos.manoDer.rx}
          ry={nuevos.manoDer.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.manoDer.label}
          onClick={() => handle("Mano derecha")}
          onKeyDown={onKey("Mano derecha")}
        />

        {/* ===== Tobillos (nuevos) ===== */}
        <ellipse
          className="hit"
          cx={nuevos.tobilloIzq.cx}
          cy={nuevos.tobilloIzq.cy}
          rx={nuevos.tobilloIzq.rx}
          ry={nuevos.tobilloIzq.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.tobilloIzq.label}
          onClick={() => handle("Tobillo izquierda")}
          onKeyDown={onKey("Tobillo izquierda")}
        />
        <ellipse
          className="hit"
          cx={nuevos.tobilloDer.cx}
          cy={nuevos.tobilloDer.cy}
          rx={nuevos.tobilloDer.rx}
          ry={nuevos.tobilloDer.ry}
          tabIndex={0}
          role="button"
          aria-label={nuevos.tobilloDer.label}
          onClick={() => handle("Tobillo derecha")}
          onKeyDown={onKey("Tobillo derecha")}
        />
      </svg>
    </div>
  );
}
