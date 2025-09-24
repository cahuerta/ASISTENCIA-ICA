// src/rodilla/rodilla.jsx
"use client";
import React, { useMemo, useState } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/* === Imágenes locales (según tu repo) === */
import imgFrenteDerecha from "./rodillafrentederecha.jpg";
import imgFrenteIzquierda from "./rodillafrenteizquierda.jpg";
import imgLateral from "./rodillalateral.jpg";
/* En el repo se llama 'rodillaposterioderecha.jpg' (sin la 'r' después de 'posterio') */
import imgPosterioDerecha from "./rodillaposterioderecha.jpg";

/* Mapa por vista/lado */
const IMG = {
  frontal: {
    derecha: imgFrenteDerecha,
    izquierda: imgFrenteIzquierda,
  },
  lateral: {
    derecha: imgLateral,
    izquierda: imgLateral,
  },
  posterior: {
    derecha: imgPosterioDerecha,
    izquierda: imgPosterioDerecha, // placeholder hasta tener la izquierda
  },
};

/**
 * Props (no cambio la API del padre):
 *  - ladoInicial: "derecha" | "izquierda"   (solo label, sin selector)
 *  - vistaInicial: "frontal" | "lateral" | "posterior"
 *  - imagenSrc?: string  (si el padre la pasa, se usa tal cual)
 *  - onSave, onVolver
 */
export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frontal",
  imagenSrc,            // ← opcional, se respeta si viene del padre
  onSave,
  onVolver,
}) {
  const [vista, setVista] = useState(vistaInicial);
  const lado = ladoInicial;

  // Evitar parpadeos mientras carga la imagen
  const [loaded, setLoaded] = useState(false);

  const { activos, toggle, clearAll } = useKneeState({ lado, vista });

  const puntos = useMemo(() => {
    const tabla = RODILLA_PUNTOS_BY_VISTA?.[vista] || [];
    return tabla.map((p) => {
      let { x, y } = p;
      if (x <= 1 && y <= 1) { x *= 100; y *= 100; }      // 0–1 → %
      else if (x > 100 || y > 100) { x = (x/1000)*100; y = (y/1000)*100; } // px → %
      return { ...p, x, y };
    });
  }, [vista]);

  function handleSave() {
    onSave?.({
      modulo: "rodilla",
      lado,
      vistaSeleccionada: vista,
      puntosActivos: activos[vista] ? Array.from(activos[vista]) : [],
    });
  }

  // Ruta final de imagen: primero la que pase el padre; si no, la local
  const imgSrc = imagenSrc || IMG[vista]?.[lado] || IMG[vista] || imgFrenteDerecha;

  return (
    <div style={{ width:"100%", maxWidth:520, margin:"0 auto", fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* Label del lado (informativo) */}
      <div style={{ marginBottom:8 }}>
        <span style={{ fontSize:14, opacity:.9, padding:"6px 10px", borderRadius:12, background:"rgba(0,0,0,0.06)" }}>
          {`Zona seleccionada: Rodilla — ${RODILLA_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Imagen + overlay */}
      <div
        style={{
          position:"relative",
          width:"100%",
          borderRadius:16,
          overflow:"hidden",
          boxShadow:"0 8px 24px rgba(0,0,0,0.15)",
          background:"#f2f2f2",
          aspectRatio:"3 / 4",
          minHeight:360,
        }}
      >
        {/* Chips arriba (vistosos) */}
        {loaded && (
          <div
            style={{
              position:"absolute", top:10, left:"50%", transform:"translateX(-50%)",
              display:"flex", gap:8, zIndex:3, backdropFilter:"blur(6px)"
            }}
          >
            {["frontal","lateral","posterior"].map((v) => (
              <VistaChip
                key={v}
                active={vista===v}
                onClick={() => { setLoaded(false); setVista(v); }}
                label={v.toUpperCase()}
              />
            ))}
          </div>
        )}

        {/* Imagen base */}
        <img
          src={imgSrc}
          alt={`Rodilla ${vista} ${lado}`}
          onLoad={() => setLoaded(true)}
          style={{ display:"block", width:"100%", height:"100%", objectFit:"cover" }}
          draggable={false}
        />

        {/* Puntos sobre la imagen */}
        {loaded && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
          >
            {puntos.map((p) => {
              const isOn = activos[vista]?.has?.(p.id);
              return (
                <Marker
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  active={!!isOn}
                  onClick={() => toggle(vista, p.id)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Acciones debajo */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginTop:12 }}>
        <Button subtle onClick={() => clearAll(vista)}>Desactivar todos</Button>
        <Button onClick={handleSave}>Guardar / Enviar</Button>
        <Button outline onClick={onVolver}>Volver</Button>
      </div>
    </div>
  );
}

/* ===== UI helpers ===== */
function VistaChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        pointerEvents:"auto",
        border:"none",
        padding:"8px 12px",
        borderRadius:999,
        fontSize:12, fontWeight:700, letterSpacing:.6, textTransform:"uppercase",
        boxShadow: active ? "0 4px 14px rgba(0,0,0,0.25)" : "0 2px 6px rgba(0,0,0,0.12)",
        background: active ? "#111" : "rgba(0,0,0,0.6)",
        color:"#fff", opacity: active ? 1 : .85,
        transform: active ? "translateY(-1px)" : "none",
        transition:"all .15s ease",
        backdropFilter:"blur(6px)",
      }}
    >
      {label}
    </button>
  );
}

function Button({ children, onClick, outline, subtle }) {
  const base = { borderRadius:12, padding:"10px 14px", fontWeight:650, fontSize:14, cursor:"pointer", border:"1px solid transparent", transition:"all .15s ease" };
  let style = {};
  if (subtle) style = { background:"rgba(0,0,0,0.06)", color:"#111", borderColor:"rgba(0,0,0,0.08)" };
  else if (outline) style = { background:"transparent", color:"#111", borderColor:"rgba(0,0,0,0.25)" };
  else style = { background:"#111", color:"#fff", borderColor:"#111", boxShadow:"0 6px 18px rgba(0,0,0,0.18)" };
  return <button onClick={onClick} style={{ ...base, ...style }}>{children}</button>;
}

function Marker({ cx, cy, active, onClick }) {
  const r = 2.7;
  return (
    <g
      transform={`translate(${cx} ${cy})`}
      style={{ pointerEvents:"auto", cursor:"pointer" }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }}
    >
      <circle r={5.8} fill="transparent" />
      <circle r={r + 1.2} fill={active ? "#0f0f0f" : "#ffffff"} stroke="#0f0f0f" strokeWidth="0.6" opacity={active ? 1 : 0.9} />
      {active && <circle r={r - 1.2} fill="#ffffff" opacity={0.95} />}
    </g>
  );
        }
