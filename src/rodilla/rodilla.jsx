// src/rodilla/rodilla.jsx
"use client";
import React, { useMemo, useState } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/* === Imágenes locales (según tu repo) === */
import imgFrenteDerecha from "./rodillafrentederecha.jpg";
import imgFrenteIzquierda from "./rodillafrenteizquierda.jpg";
import imgLateral from "./rodillalateral.jpg";
/* OJO: nombre exacto del repo: 'rodillaposterioderecha.jpg' */
import imgPosterioDerecha from "./rodillaposterioderecha.jpg";

/* Normaliza import de imagen a URL (sirve para Next y para Vite) */
function toUrl(img) {
  return typeof img === "string" ? img : img?.src || "";
}

/* Mapa por vista/lado (con URLs ya normalizadas) */
const IMG = {
  frontal: {
    derecha: toUrl(imgFrenteDerecha),
    izquierda: toUrl(imgFrenteIzquierda),
  },
  lateral: {
    derecha: toUrl(imgLateral),
    izquierda: toUrl(imgLateral),
  },
  posterior: {
    derecha: toUrl(imgPosterioDerecha),
    izquierda: toUrl(imgPosterioDerecha), // placeholder hasta tener la izquierda
  },
};

/* Encuentra la key correcta de la vista según cómo esté definida en rodillapuntos.js */
function getVistaKey(obj, vista) {
  const cands = [
    vista,
    vista === "frontal" ? "frente" : "",
    vista === "frontal" ? "anterior" : "",
    vista?.toUpperCase?.(),
    vista === "frontal" ? "FRONTAL" : "",
    "frente",
    "anterior",
  ].filter(Boolean);
  return cands.find((k) => obj && Object.prototype.hasOwnProperty.call(obj, k)) || vista;
}

/**
 * Props (NO cambia API del padre):
 *  - ladoInicial: "derecha" | "izquierda"   (solo label, sin selector)
 *  - vistaInicial: "frontal" | "lateral" | "posterior"
 *  - imagenSrc?: string  (si el padre la envía, se usa tal cual)
 *  - onSave(payload), onVolver()
 */
export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frontal",
  imagenSrc, // opcional
  onSave,
  onVolver,
}) {
  const [vista, setVista] = useState(vistaInicial);
  const lado = ladoInicial;

  // Evita parpadeos mientras carga la imagen
  const [loaded, setLoaded] = useState(false);

  const { activos, toggle, clearAll } = useKneeState({ lado, vista });

  const puntos = useMemo(() => {
    const key = getVistaKey(RODILLA_PUNTOS_BY_VISTA, vista);
    const tabla = RODILLA_PUNTOS_BY_VISTA?.[key] || [];
    return tabla.map((p) => normalizePoint(p));
  }, [vista]);

  function normalizePoint(p) {
    let { x, y } = p;
    if (x <= 1 && y <= 1) {
      x *= 100; y *= 100; // 0–1 → %
    } else if (x > 100 || y > 100) {
      x = (x / 1000) * 100; y = (y / 1000) * 100; // px → % (base 1000)
    }
    return { ...p, x, y };
  }

  function handleSave() {
    onSave?.({
      modulo: "rodilla",
      lado,
      vistaSeleccionada: vista,
      puntosActivos: activos[vista] ? Array.from(activos[vista]) : [],
    });
  }

  // Ruta final: prioridad a imagenSrc del padre; si no viene, usar mapa local
  const imgSrc =
    imagenSrc ||
    (typeof IMG[vista] === "object" ? IMG[vista]?.[lado] : IMG[vista]) ||
    toUrl(imgFrenteDerecha);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
        color: "#111",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Label informativo del lado */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 14,
            opacity: 0.9,
            padding: "6px 10px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.06)",
          }}
        >
          {`Zona seleccionada: Rodilla — ${RODILLA_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Contenedor imagen + overlay */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          background: "#f2f2f2",
          aspectRatio: "3 / 4", // evita colapso al cargar
          minHeight: 360,
        }}
      >
        {/* Chips de vista arriba (vistosos) */}
        {loaded && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 8,
              zIndex: 3,
              backdropFilter: "blur(6px)",
            }}
          >
            {["frontal", "lateral", "posterior"].map((v) => (
              <VistaChip
                key={v}
                active={vista === v}
                onClick={() => {
                  setLoaded(false); // espera nueva carga si cambia imagen
                  setVista(v);
                }}
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
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          draggable={false}
        />

        {/* Puntos superpuestos */}
        {loaded && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
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
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <Button subtle onClick={() => clearAll(vista)}>Desactivar todos</Button>
        <Button onClick={handleSave}>Guardar / Enviar</Button>
        <Button outline onClick={onVolver}>Volver</Button>
      </div>
    </div>
  );
}

/* ====== UI helpers ====== */
function VistaChip({ active, onClick, label }) {
  return (
    <button
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
        boxShadow: active
          ? "0 4px 14px rgba(0,0,0,0.25)"
          : "0 2px 6px rgba(0,0,0,0.12)",
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

function Button({ children, onClick, outline, subtle }) {
  const base = {
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 650,
    fontSize: 14,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "all .15s ease",
  };
  let style = {};
  if (subtle) {
    style = {
      background: "rgba(0,0,0,0.06)",
      color: "#111",
      borderColor: "rgba(0,0,0,0.08)",
    };
  } else if (outline) {
    style = {
      background: "transparent",
      color: "#111",
      borderColor: "rgba(0,0,0,0.25)",
    };
  } else {
    style = {
      background: "#111",
      color: "#fff",
      borderColor: "#111",
      boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
    };
  }
  return (
    <button onClick={onClick} style={{ ...base, ...style }}>
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* halo para click cómodo */}
      <circle r={5.8} fill="transparent" />
      {/* borde */}
      <circle
        r={r + 1.2}
        fill={active ? "#0f0f0f" : "#ffffff"}
        stroke="#0f0f0f"
        strokeWidth="0.6"
        opacity={active ? 1 : 0.9}
      />
      {/* centro activo */}
      {active && <circle r={r - 1.2} fill="#ffffff" opacity={0.95} />}
    </g>
  );
        }
