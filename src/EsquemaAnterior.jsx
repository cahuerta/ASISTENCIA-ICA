// src/EsquemaAnterior.jsx
import React from "react";
import cuerpoFrontal from "./assets/cuerpoFrontal.png";
import { getTheme } from "./theme.js";

const T = getTheme();

/**
 * Esquema anterior (híbrido): imagen base + hotspots SVG.
 * - Caderas y Rodillas existentes se mantienen EXACTAMENTE igual.
 * - Hombro/Codo/Mano más altos (mismo delta); Tobillo más bajo.
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
  const puntos = {
    // En pantalla IZQUIERDA => DERECHA del paciente (NO TOCAR)
    pantallaIzq_cadera: { cx: VB * 0.43, cy: VB * 0.48, rx: 48, ry: 40 },
    pantallaDer_cadera: { cx: VB * 0.57, cy: VB * 0.48, rx: 48, ry: 40 },

    // Rodillas (NO TOCAR)
    pantallaIzq_rodilla: { cx: VB * 0.42, cy: VB * 0.75, rx: 44, ry: 44 },
    pantallaDer_rodilla: { cx: VB * 0.58, cy: VB * 0.75, rx: 44, ry: 44 },

    // ===== Nuevos (ajustados con el mismo delta en altura) =====
    // Hombros (igual a rodilla) — MÁS ARRIBA (cy 0.215)
    pantallaIzq_hombro: { cx: VB * 0.34, cy: VB * 0.215, rx: 44, ry: 44 },
    pantallaDer_hombro: { cx: VB * 0.66, cy: VB * 0.215, rx: 44, ry: 44 },

    // Codos (más chico que hombro) — MÁS ARRIBA (cy 0.45)
    pantallaIzq_codo: { cx: VB * 0.28, cy: VB * 0.45, rx: 38, ry: 38 },
    pantallaDer_codo: { cx: VB * 0.72, cy: VB * 0.45, rx: 38, ry: 38 },

    // Manos (más chicas que codo) — MÁS ARRIBA (cy 0.63)
    pantallaIzq_mano: { cx: VB * 0.24, cy: VB * 0.63, rx: 32, ry: 32 },
    pantallaDer_mano: { cx: VB * 0.76, cy: VB * 0.63, rx: 32, ry: 32 },

    // Tobillos (igual a codo) — MÁS ABAJO (cy 0.975)
    pantallaIzq_tobillo: { cx: VB * 0.45, cy: VB * 0.975, rx: 38, ry: 38 },
    pantallaDer_tobillo: { cx: VB * 0.55, cy: VB * 0.975, rx: 38, ry: 38 },
  };

  const onKey = (z) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handle(z);
    }
  };

  const hitFill = T.primary ?? "#2f6bd8";

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
              fill: ${hitFill};
              opacity: .18;
              transition: opacity .15s ease;
              pointer-events: auto;
              cursor: pointer;
            }
            .hit:hover, .hit:focus { opacity: .30; outline: none; }
          `}</style>
        </defs>

        {/* ===== CADERAS ===== */}
        <ellipse className="hit" cx={puntos.pantallaIzq_cadera.cx} cy={puntos.pantallaIzq_cadera.cy} rx={puntos.pantallaIzq_cadera.rx} ry={puntos.pantallaIzq_cadera.ry} tabIndex={0} role="button" aria-label="Cadera derecha (inguinal)" onClick={() => handle("Cadera derecha")} onKeyDown={onKey("Cadera derecha")} />
        <ellipse className="hit" cx={puntos.pantallaDer_cadera.cx} cy={puntos.pantallaDer_cadera.cy} rx={puntos.pantallaDer_cadera.rx} ry={puntos.pantallaDer_cadera.ry} tabIndex={0} role="button" aria-label="Cadera izquierda (inguinal)" onClick={() => handle("Cadera izquierda")} onKeyDown={onKey("Cadera izquierda")} />

        {/* ===== RODILLAS ===== */}
        <ellipse className="hit" cx={puntos.pantallaIzq_rodilla.cx} cy={puntos.pantallaIzq_rodilla.cy} rx={puntos.pantallaIzq_rodilla.rx} ry={puntos.pantallaIzq_rodilla.ry} tabIndex={0} role="button" aria-label="Rodilla derecha" onClick={() => handle("Rodilla derecha")} onKeyDown={onKey("Rodilla derecha")} />
        <ellipse className="hit" cx={puntos.pantallaDer_rodilla.cx} cy={puntos.pantallaDer_rodilla.cy} rx={puntos.pantallaDer_rodilla.rx} ry={puntos.pantallaDer_rodilla.ry} tabIndex={0} role="button" aria-label="Rodilla izquierda" onClick={() => handle("Rodilla izquierda")} onKeyDown={onKey("Rodilla izquierda")} />

        {/* ===== HOMBROS ===== */}
        <ellipse className="hit" cx={puntos.pantallaIzq_hombro.cx} cy={puntos.pantallaIzq_hombro.cy} rx={puntos.pantallaIzq_hombro.rx} ry={puntos.pantallaIzq_hombro.ry} tabIndex={0} role="button" aria-label="Hombro derecho" onClick={() => handle("Hombro derecho")} onKeyDown={onKey("Hombro derecho")} />
        <ellipse className="hit" cx={puntos.pantallaDer_hombro.cx} cy={puntos.pantallaDer_hombro.cy} rx={puntos.pantallaDer_hombro.rx} ry={puntos.pantallaDer_hombro.ry} tabIndex={0} role="button" aria-label="Hombro izquierdo" onClick={() => handle("Hombro izquierdo")} onKeyDown={onKey("Hombro izquierdo")} />

        {/* ===== CODOS ===== */}
        <ellipse className="hit" cx={puntos.pantallaIzq_codo.cx} cy={puntos.pantallaIzq_codo.cy} rx={puntos.pantallaIzq_codo.rx} ry={puntos.pantallaIzq_codo.ry} tabIndex={0} role="button" aria-label="Codo derecho" onClick={() => handle("Codo derecho")} onKeyDown={onKey("Codo derecho")} />
        <ellipse className="hit" cx={puntos.pantallaDer_codo.cx} cy={puntos.pantallaDer_codo.cy} rx={puntos.pantallaDer_codo.rx} ry={puntos.pantallaDer_codo.ry} tabIndex={0} role="button" aria-label="Codo izquierdo" onClick={() => handle("Codo izquierdo")} onKeyDown={onKey("Codo izquierdo")} />

        {/* ===== MANOS ===== */}
        <ellipse className="hit" cx={puntos.pantallaIzq_mano.cx} cy={puntos.pantallaIzq_mano.cy} rx={puntos.pantallaIzq_mano.rx} ry={puntos.pantallaIzq_mano.ry} tabIndex={0} role="button" aria-label="Mano derecha" onClick={() => handle("Mano derecha")} onKeyDown={onKey("Mano derecha")} />
        <ellipse className="hit" cx={puntos.pantallaDer_mano.cx} cy={puntos.pantallaDer_mano.cy} rx={puntos.pantallaDer_mano.rx} ry={puntos.pantallaDer_mano.ry} tabIndex={0} role="button" aria-label="Mano izquierda" onClick={() => handle("Mano izquierda")} onKeyDown={onKey("Mano izquierda")} />

        {/* ===== TOBILLOS ===== */}
        <ellipse className="hit" cx={puntos.pantallaIzq_tobillo.cx} cy={puntos.pantallaIzq_tobillo.cy} rx={puntos.pantallaIzq_tobillo.rx} ry={puntos.pantallaIzq_tobillo.ry} tabIndex={0} role="button" aria-label="Tobillo derecho" onClick={() => handle("Tobillo derecho")} onKeyDown={onKey("Tobillo derecho")} />
        <ellipse className="hit" cx={puntos.pantallaDer_tobillo.cx} cy={puntos.pantallaDer_tobillo.cy} rx={puntos.pantallaDer_tobillo.rx} ry={puntos.pantallaDer_tobillo.ry} tabIndex={0} role="button" aria-label="Tobillo izquierdo" onClick={() => handle("Tobillo izquierdo")} onKeyDown={onKey("Tobillo izquierdo")} />
      </svg>
    </div>
  );
}
