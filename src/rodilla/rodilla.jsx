// src/rodilla/rodilla.jsx
"use client";
import React, { useMemo, useState } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/**
 * RodillaMapper — PNG + SVG (overlay)
 * - Puntos predispuestos (click = activa/desactiva)
 * - Sin selector de lado: solo label (usa ladoInicial)
 * - Botones de vista arriba de la imagen, más vistosos
 * - Guardar/Volver debajo de la imagen
 *
 * Props:
 *  - ladoInicial: "derecha" | "izquierda"
 *  - vistaInicial: "frontal" | "lateral" | "posterior"
 *  - imagenSrc: string (ruta de la rodilla para la vista actual; si no se pasa, usa una por defecto)
 *  - onSave(payload): { modulo:"rodilla", lado, vistaSeleccionada, puntosActivos:[ids] }
 *  - onVolver(): void
 */
export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frontal",
  imagenSrc,
  onSave,
  onVolver,
}) {
  const [vista, setVista] = useState(vistaInicial);
  const lado = ladoInicial; // ← no hay selector, solo label

  // Hook de estado de puntos (activos/inactivos)
  const { activos, toggle, clearAll } = useKneeState({
    lado,
    vista,
  });

  // Puntos para la vista seleccionada
  const puntos = useMemo(() => {
    const tabla = RODILLA_PUNTOS_BY_VISTA?.[vista] || [];
    return tabla.map((p) => normalizePoint(p));
  }, [vista]);

  // Imagen por defecto opcional (por si no te pasan imagen por prop)
  const defaultImg =
    imagenSrc ||
    (vista === "posterior"
      ? "/img/rodilla_posterior.jpg"
      : vista === "lateral"
      ? "/img/rodilla_lateral.jpg"
      : "/img/rodilla_frontal.jpg");

  function normalizePoint(p) {
    // Acepta {id, x, y} en 0–1, 0–100 o px; normaliza a porcentaje 0–100
    let x = p.x;
    let y = p.y;
    const likelyFraction = x <= 1 && y <= 1;
    const likelyPercent = x <= 100 && y <= 100;
    if (likelyFraction) {
      x = x * 100;
      y = y * 100;
    } else if (!likelyPercent) {
      // px → asume base 1000 px
      x = (x / 1000) * 100;
      y = (y / 1000) * 100;
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
      {/* Encabezado: label de lado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 14,
            opacity: 0.85,
            padding: "6px 10px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.06)",
          }}
          title="Lado detectado automáticamente"
        >
          {`Zona seleccionada: Rodilla — ${RODILLA_LABELS?.[lado] || lado}`}
        </div>
      </div>

      {/* Contenedor de imagen + overlay */}
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
        {/* Botones de vista (arriba, overlay) */}
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
              onClick={() => setVista(v)}
              label={v.toUpperCase()}
            />
          ))}
        </div>

        {/* Imagen base */}
        <img
          src={defaultImg}
          alt={`Rodilla ${vista}`}
          style={{ display: "block", width: "100%", height: "auto" }}
          draggable={false}
        />

        {/* Overlay SVG para puntos */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none", // los clicks entran solo en los botones/markers
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
      </div>

      {/* Acciones debajo de la foto */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <Button subtle onClick={() => clearAll(vista)}>
          Desactivar todos
        </Button>
        <Button onClick={handleSave}>Guardar / Enviar</Button>
        <Button outline onClick={onVolver}>
          Volver
        </Button>
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
