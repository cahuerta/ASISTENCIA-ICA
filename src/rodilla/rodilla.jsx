// src/rodilla/rodilla.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/* ← Tema (lee theme.json vía getTheme) */
import { getTheme } from "../theme.js";
const T = getTheme();
const THEME = {
  markerStroke: T?.rodilla?.markerStroke ?? "rgba(0,0,0,0.75)",
  markerFill: T?.rodilla?.markerFill ?? "rgba(255,255,255,0.95)",
  markerActive: T?.rodilla?.markerActive ?? "rgba(30,41,59,1.0)",
  markerShadow: T?.rodilla?.markerShadow ?? "rgba(0,0,0,0.18)",
  chipBg: T?.rodilla?.chipBg ?? "rgba(15,23,42,0.65)",
  chipActiveBg: T?.rodilla?.chipActiveBg ?? "rgba(15,23,42,1)",
  chipColor: T?.rodilla?.chipColor ?? "#fff",
};

/* Imágenes locales (nombres EXACTOS en tu repo) */
import imgFrenteDerecha from "./rodillafrentederecha.jpg";
import imgFrenteIzquierda from "./rodillafrenteizquierda.jpg";
import imgLateral from "./rodillalateral.jpg";
import imgPosteriorDerecha from "./rodillaposteriorderecha.jpg";

/* Helper: import → URL (Vite/Next) */
const toUrl = (img) => (typeof img === "string" ? img : img?.src || "");

/* Mapa imagen por vista/lado usando claves: frente | lateral | posterior */
const IMG = {
  frente:    { derecha: toUrl(imgFrenteDerecha),    izquierda: toUrl(imgFrenteIzquierda) },
  lateral:   { derecha: toUrl(imgLateral),          izquierda: toUrl(imgLateral) },
  posterior: { derecha: toUrl(imgPosteriorDerecha), izquierda: toUrl(imgPosteriorDerecha) }, // placeholder
};

/* Etiquetas visibles en tabs */
const VISTA_LABEL = { frente: "FRONTAL", lateral: "LATERAL", posterior: "POSTERIOR" };

/* Devuelve los puntos de una vista con selected:false */
const puntosDeVista = (vista) =>
  (RODILLA_PUNTOS_BY_VISTA?.[vista] || []).map((p) => ({ ...p, selected: !!p.selected }));

/* === Persistencia en localStorage === */
const storageKey = (lado) => `rodilla:${lado}`;
function loadPersisted(lado) {
  try {
    const raw = localStorage.getItem(storageKey(lado));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function savePersisted(lado, data) {
  try {
    localStorage.setItem(storageKey(lado), JSON.stringify(data));
  } catch {}
}

export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frente",
  imagenSrc,    // opcional: el padre puede sobreescribir la imagen
  onSave,
  onVolver,
}) {
  const [vista, setVista] = useState(vistaInicial);
  const lado = (ladoInicial || "").toLowerCase();

  /* Hook de estado: arranca con puntos visibles */
  const {
    puntos,        // [{key, x, y, selected, label?}]
    setPuntos,
    togglePunto,
    clearSelection
  } = useKneeState(puntosDeVista(vistaInicial));

  /* Al montar: restaurar selección de esta vista si existe */
  useEffect(() => {
    const persisted = loadPersisted(lado);
    if (persisted?.[vistaInicial]) {
      setPuntos((arr) => arr.map((p, i) => ({ ...p, selected: !!persisted[vistaInicial][i] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Cambio de vista → cargar puntos base + restaurar selección persistida */
  useEffect(() => {
    const base = puntosDeVista(vista);
    const persisted = loadPersisted(lado);
    const withSelection = persisted?.[vista]
      ? base.map((p, i) => ({ ...p, selected: !!persisted[vista][i] }))
      : base;
    setPuntos(withSelection);
  }, [vista, lado, setPuntos]);

  /* Persistir cada vez que cambian los puntos en esta vista */
  useEffect(() => {
    const persisted = loadPersisted(lado) || { frente: [], lateral: [], posterior: [] };
    persisted[vista] = puntos.map((p) => !!p.selected);
    savePersisted(lado, persisted);
  }, [puntos, vista, lado]);

  const handleToggle = useCallback((index) => {
    togglePunto(index);
  }, [togglePunto]);

  /* Ruta imagen final */
  const imgSrc =
    (typeof imagenSrc === "string" && imagenSrc) ||
    IMG?.[vista]?.[lado] ||
    IMG?.[vista]?.derecha ||
    toUrl(imgFrenteDerecha);

  /* Normaliza coords para render y prepara el texto de etiqueta */
  const puntosRender = useMemo(
    () =>
      puntos.map((p) => ({
        ...p,
        cx: p.x * 100,
        cy: p.y * 100,
        labelText: p.label || p.key || "",
      })),
    [puntos]
  );

  const handleSave = () => {
    const activos = puntos.filter((p) => p.selected).map((p) => p.key);
    onSave?.({
      modulo: "rodilla",
      lado,
      vistaSeleccionada: vista,
      puntosActivos: activos,
    });
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
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

      {/* Contenedor con ratio 4:3 */}
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

        {/* Tabs de vista */}
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
            <VistaChip
              key={v}
              active={vista === v}
              onClick={() => setVista(v)}
              label={VISTA_LABEL[v]}
            />
          ))}
        </div>

        {/* Overlay de puntos */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "auto" }}
        >
          {puntosRender.map((p, i) => (
            <Marker
              key={p.key || i}
              cx={p.cx}
              cy={p.cy}
              active={p.selected}
              label={p.labelText}
              onClick={() => handleToggle(i)}
            />
          ))}
        </svg>
      </div>

      {/* Acciones */}
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
        background: active ? THEME.chipActiveBg : THEME.chipBg,
        color: THEME.chipColor,
        opacity: active ? 1 : 0.92,
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

/* Marcador con estilo desde theme.json + etiqueta cuando activo */
function Marker({ cx, cy, active, label, onClick }) {
  const r = 2.6;
  const textLen = Math.max(3, Math.min(30, (label || "").length));
  const padX = 2.2;
  const padY = 1.6;
  const charW = 1.3;
  const tagW = textLen * charW + padX * 2;
  const tagH = 5;
  const offsetY = 7;

  return (
    <g
      transform={`translate(${cx} ${cy})`}
      style={{ pointerEvents: "auto", cursor: "pointer" }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }}
    >
      {/* halo de click */}
      <circle r={6.2} fill="transparent" />

      {/* sombra sutil */}
      <circle
        r={r + 1.6}
        fill={THEME.markerFill}
        opacity="0.0001"
        style={{ filter: `drop-shadow(0 0.5px 1.2px ${THEME.markerShadow})` }}
      />

      {/* aro exterior (siempre visible) */}
      <circle
        r={r + 1.0}
        fill={THEME.markerFill}
        stroke={THEME.markerStroke}
        strokeWidth="0.6"
        opacity={1}
      />

      {/* centro activo */}
      {active && <circle r={r - 0.6} fill={THEME.markerActive} opacity="0.95" />}

      {/* etiqueta cuando activo */}
      {active && !!label && (
        <g transform={`translate(${-tagW / 2} ${-offsetY})`}>
          <rect
            x={0}
            y={-tagH}
            rx={1.6}
            ry={1.6}
            width={tagW}
            height={tagH}
            fill="rgba(17,17,17,0.92)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.2"
          />
          <text
            x={tagW / 2}
            y={-tagH / 2 + 0.8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="3"
            fontWeight="600"
            fill="#fff"
            style={{ letterSpacing: 0.2 }}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
