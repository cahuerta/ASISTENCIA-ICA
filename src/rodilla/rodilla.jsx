// src/rodilla/rodilla.jsx
import React, { useMemo, useState, useEffect } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/* Imágenes locales (nombres EXACTOS en tu repo) */
import imgFrenteDerecha from "./rodillafrentederecha.jpg";
import imgFrenteIzquierda from "./rodillafrenteizquierda.jpg";
import imgLateral from "./rodillalateral.jpg";
import imgPosteriorDerecha from "./rodillaposteriorderecha.jpg";

/* Helper: import → URL (Vite/Next) */
const toUrl = (img) => (typeof img === "string" ? img : img?.src || "");

/* Mapa imagen por vista/lado usando TUS claves de vista: frente | lateral | posterior */
const IMG = {
  frente:   { derecha: toUrl(imgFrenteDerecha),   izquierda: toUrl(imgFrenteIzquierda) },
  lateral:  { derecha: toUrl(imgLateral),         izquierda: toUrl(imgLateral) },
  posterior:{ derecha: toUrl(imgPosteriorDerecha),izquierda: toUrl(imgPosteriorDerecha) }, // placeholder
};

/* Devuelve los puntos de una vista con `selected:false` */
const puntosDeVista = (vista) =>
  (RODILLA_PUNTOS_BY_VISTA?.[vista] || []).map((p) => ({ ...p, selected: !!p.selected }));

export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frente",   // ← por defecto igual a tus datos
  imagenSrc,                 // opcional: el padre puede sobreescribir la imagen
  onSave,
  onVolver,
}) {
  const [vista, setVista] = useState(vistaInicial);
  const lado = (ladoInicial || "").toLowerCase();

  /* Hook de estado: arranca con los puntos de la vista inicial */
  const {
    puntos,        // [{key, x, y, selected}]
    setPuntos,     // para cambiar puntos al cambiar la vista
    togglePunto,   // (index) => void
    clearSelection
  } = useKneeState(puntosDeVista(vistaInicial));

  /* Cuando cambia la vista, cargamos los puntos respectivos */
  useEffect(() => {
    setPuntos(puntosDeVista(vista));
  }, [vista, setPuntos]);

  /* Ruta final de imagen (respeta la del padre si llega) */
  const imgSrc =
    (typeof imagenSrc === "string" && imagenSrc) ||
    IMG?.[vista]?.[lado] ||
    IMG?.[vista]?.derecha || // fallback
    toUrl(imgFrenteDerecha);

  /* Normaliza a % solo para render (tus coords ya vienen en 0..1) */
  const puntosRender = useMemo(
    () => puntos.map((p) => ({ ...p, cx: p.x * 100, cy: p.y * 100 })),
    [puntos]
  );

  const handleSave = () => {
    const activos = puntos.filter((p) => p.selected).map((p) => p.key);
    onSave?.({
      modulo: "rodilla",
      lado,
      vistaSeleccionada: vista,
      puntosActivos: activos, // arreglo de keys
    });
  };

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* Label informativo del lado */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 14, opacity: 0.9, padding: "6px 10px", borderRadius: 12, background: "rgba(0,0,0,0.06)" }}>
          {`Zona seleccionada: Rodilla — ${RODILLA_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Contenedor con ratio fijo 4:3 y contenido absoluto */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          background: "#f2f2f2",
        }}
      >
        <div style={{ paddingTop: "133.333%" }} />

        {/* Imagen base */}
        <img
          src={imgSrc}
          alt={`Rodilla ${vista} ${lado}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          draggable={false}
        />

        {/* Botones de vista arriba (frente/lateral/posterior) */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            zIndex: 3,
            pointerEvents: "auto",
            backdropFilter: "blur(6px)",
          }}
        >
          {["frente", "lateral", "posterior"].map((v) => (
            <VistaChip key={v} active={vista === v} onClick={() => setVista(v)} label={v.toUpperCase()} />
          ))}
        </div>

        {/* Overlay de puntos (clickeable) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "auto" }}
        >
          {puntosRender.map((p, i) => (
            <Marker
              key={p.key}           // clave estable para React
              cx={p.cx}
              cy={p.cy}
              active={p.selected}
              onClick={() => togglePunto(i)}  // ← toggle por ÍNDICE (como tu hook)
            />
          ))}
        </svg>
      </div>

      {/* Acciones debajo */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
        <Button type="button" subtle onClick={() => clearSelection()}>Desactivar todos</Button>
        <Button type="button" onClick={handleSave}>Guardar / Enviar</Button>
        <Button type="button" outline onClick={onVolver}>Volver</Button>
      </div>
    </div>
  );
}

/* ===== UI helpers ===== */
function VistaChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        pointerEvents: "auto",
        border: "none",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        boxShadow: active ? "0 4px 14px rgba(0,0,0,0.25)" : "0 2px 6px rgba(0,0,0,0.12)",
        background: active ? "#111" : "rgba(0,0,0,0.6)",
        color: "#fff",
        opacity: active ? 1 : 0.85,
        transform: active ? "translateY(-1px)" : "none",
        transition: "all .15s ease",
        backdropFilter: "blur(6px)",
      }}
    >
      {label}
    </button>
  );
}

function Button({ children, onClick, outline, subtle, type = "button" }) {
  const base = { borderRadius: 12, padding: "10px 14px", fontWeight: 650, fontSize: 14, cursor: "pointer", border: "1px solid transparent", transition: "all .15s ease" };
  let style = {};
  if (subtle) style = { background: "rgba(0,0,0,0.06)", color: "#111", borderColor: "rgba(0,0,0,0.08)" };
  else if (outline) style = { background: "transparent", color: "#111", borderColor: "rgba(0,0,0,0.25)" };
  else style = { background: "#111", color: "#fff", borderColor: "#111", boxShadow: "0 6px 18px rgba(0,0,0,0.18)" };
  return (
    <button type={type} onClick={onClick} style={{ ...base, ...style }}>
      {children}
    </button>
  );
}

function Marker({ cx, cy, active, onClick }) {
  const r = 2.7;
  return (
    <g
      transform={`translate(${cx} ${cy})`}
      style={{ pointerEvents: "auto", cursor: "pointer" }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }}
    >
      {/* halo para click cómodo */}
      <circle r={5.8} fill="transparent" />
      {/* borde */}
      <circle r={r + 1.2} fill={active ? "#0f0f0f" : "#ffffff"} stroke="#0f0f0f" strokeWidth="0.6" opacity={active ? 1 : 0.9} />
      {/* centro activo */}
      {active && <circle r={r - 1.2} fill="#ffffff" opacity={0.95} />}
    </g>
  );
}
