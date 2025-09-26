// src/rodilla/rodilla.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/* Tema (solo paleta padre; SIN bloque "rodilla") */
import { getTheme } from "../theme.js";
const T = getTheme();
const THEME = {
  markerStroke: T?.primaryDark,
  dotInactive:  T?.accentAlpha,
  dotActive:    T?.primary,
  markerShadow: T?.overlay,
  chipBg:       T?.accentAlpha,
  chipActiveBg: T?.primaryDark,
  chipColor:    T?.onPrimary,
};

/* Imágenes locales */
import imgFrenteDerecha from "./rodillafrentederecha.jpg";
import imgFrenteIzquierda from "./rodillafrenteizquierda.jpg";
import imgLateral from "./rodillalateral.jpg";
import imgPosteriorDerecha from "./rodillaposteriorderecha.jpg";

/* Helper: import → URL (Vite/Next) */
const toUrl = (img) => (typeof img === "string" ? img : img?.src || "");

/* Normaliza vista externa → interna */
function normVista(v) {
  const key = (v || "").toLowerCase();
  if (key === "anterior" || key === "frontal" || key === "frente") return "frente";
  if (key === "lateral") return "lateral";
  if (key === "posterior") return "posterior";
  return "frente";
}

/* Mapa imagen por vista/lado */
const IMG = {
  frente:    { derecha: toUrl(imgFrenteDerecha),    izquierda: toUrl(imgFrenteIzquierda) },
  lateral:   { derecha: toUrl(imgLateral),          izquierda: toUrl(imgLateral) },
  posterior: { derecha: toUrl(imgPosteriorDerecha), izquierda: toUrl(imgPosteriorDerecha) },
};

/* Etiquetas tabs */
const VISTA_LABEL = { frente: "FRONTAL", lateral: "LATERAL", posterior: "POSTERIOR" };

/* Puntos base (visibles de inmediato) */
const puntosDeVista = (vista) =>
  (RODILLA_PUNTOS_BY_VISTA?.[vista] || []).map((p) => ({ ...p, selected: !!p.selected }));

/* === Persistencia en sessionStorage (por lado y vista) === */
const storageKey = (lado) => `rodilla:${lado}`;
function loadPersisted(lado) {
  try {
    const raw = sessionStorage.getItem(storageKey(lado));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function savePersisted(lado, data) {
  try {
    sessionStorage.setItem(storageKey(lado), JSON.stringify(data));
  } catch {}
}

/* Etiquetas desde booleans */
function labelsFromBools(vista, bools) {
  const base = RODILLA_PUNTOS_BY_VISTA?.[vista] || [];
  return (Array.isArray(bools) ? bools : []).map((on, i) => (on ? (base[i]?.label || base[i]?.key) : null)).filter(Boolean);
}

export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frente",   // "anterior"/"frontal" → "frente"
  imagenSrc,                 // opcional: el padre puede sobreescribir la imagen
  onSave,
  onVolver,                  // debe VOLVER sin grabar
}) {
  const lado = (ladoInicial || "").toLowerCase();
  const vistaInicialNorm = normVista(vistaInicial);
  const [vista, setVista] = useState(vistaInicialNorm);

  // Si la página fue recargada, limpia selecciones de rodilla (no persistir a través de reload)
  useEffect(() => {
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0];
      const isReload = nav ? nav.type === "reload" : (performance?.navigation?.type === 1);
      if (isReload) {
        sessionStorage.removeItem(storageKey(lado));
        sessionStorage.removeItem(`rodilla_resumen_${lado.includes("izquierda") ? "izquierda" : "derecha"}`);
      }
    } catch {}
  }, [lado]);

  /* Estado de puntos: arranca con la vista inicial (ya visibles) */
  const {
    puntos,        // [{key, x, y, selected, label?}]
    setPuntos,
    togglePunto,
    clearSelection
  } = useKneeState(puntosDeVista(vistaInicialNorm));

  /* Al montar: restaurar selección para la vista inicial si existe */
  useEffect(() => {
    const persisted = loadPersisted(lado);
    if (persisted?.[vistaInicialNorm]?.length) {
      setPuntos((arr) => arr.map((p, i) => ({ ...p, selected: !!persisted[vistaInicialNorm][i] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Cambio de vista → cargar puntos base + restaurar selección persistida */
  useEffect(() => {
    const base = puntosDeVista(vista);
    const persisted = loadPersisted(lado);
    const withSelection = persisted?.[vista]?.length
      ? base.map((p, i) => ({ ...p, selected: !!persisted[vista][i] }))
      : base;
    setPuntos(withSelection);
  }, [vista, lado, setPuntos]);

  /* Persistir cada vez que cambian los puntos en esta vista (en sessionStorage) */
  useEffect(() => {
    const persisted = loadPersisted(lado) || { frente: [], lateral: [], posterior: [] };
    persisted[vista] = puntos.map((p) => !!p.selected);
    savePersisted(lado, persisted);
  }, [puntos, vista, lado]);

  /* Toggle index (persistencia la maneja el efecto) */
  const handleToggle = useCallback((index) => {
    togglePunto(index);
  }, [togglePunto]);

  /* Botón Volver: NO guarda; con fallbacks y sin import.meta */
  const handleVolver = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (typeof onVolver === "function") {
      onVolver(); // salir sin grabar
      return;
    }

    try { window.dispatchEvent(new CustomEvent("rodilla:volver")); } catch {}

    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      window.history.back();
      return;
    }

    if (typeof window !== "undefined") window.location.assign("/");
  }, [onVolver]);

  /* Imagen final */
  const imgSrcFinal =
    (typeof imagenSrc === "string" && imagenSrc) ||
    IMG?.[vista]?.[lado] ||
    IMG?.[vista]?.derecha ||
    toUrl(imgFrenteDerecha);

  /* ¿Debemos espejar X? (cuando la imagen izquierda es distinta a la derecha) */
  const needMirrorX = useMemo(() => {
    const map = IMG?.[vista];
    return lado === "izquierda" && map?.izquierda && map?.derecha && map.izquierda !== map.derecha;
  }, [vista, lado]);

  /* Puntos render (coords %) + etiqueta (usa p.label o key), aplicando espejo si corresponde */
  const puntosRender = useMemo(
    () => puntos.map((p) => {
      const x = p.x; // 0..1
      const y = p.y; // 0..1
      const px = needMirrorX ? (1 - x) : x;
      return {
        ...p,
        cx: px * 100,
        cy: y * 100,
        labelText: p.label || p.key || "",
      };
    }),
    [puntos, needMirrorX]
  );

  /* Guardar: consolida las TRES vistas + deja resumen por vista en sessionStorage */
  const handleSave = () => {
    // 1) Asegura que lo actual quede persistido
    const now = puntos.map((p) => !!p.selected);
    const persisted = loadPersisted(lado) || { frente: [], lateral: [], posterior: [] };
    persisted[vista] = now;
    savePersisted(lado, persisted);

    // 2) Arma resumen por vista
    const resumen = {
      frente: labelsFromBools("frente", persisted.frente),
      lateral: labelsFromBools("lateral", persisted.lateral),
      posterior: labelsFromBools("posterior", persisted.posterior),
    };

    // 3) Para PREVIEW visual: una sección con todas las vistas no vacías
    const lines = [];
    if (resumen.frente?.length)    lines.push(`Frente: ${resumen.frente.join(", ")}`);
    if (resumen.lateral?.length)   lines.push(`Lateral: ${resumen.lateral.join(", ")}`);
    if (resumen.posterior?.length) lines.push(`Posterior: ${resumen.posterior.join(", ")}`);

    const seccionesExtra = lines.length
      ? [{ title: "Zonas marcadas", lines }]
      : [];

    // 4) Para BACKEND y contrato unificado
    const activos = puntos.filter((p) => p.selected);
    const activosKeys = activos.map((p) => p.key);
    const activosLabels = activos.map((p) => p.label || p.key);

    const rodilla = {
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: activosLabels,
      puntosKeys: activosKeys,
      count: activosLabels.length,
      resumenPorVista: resumen, // ← nuevo
    };

    const r = {
      modulo: "rodilla",
      lado,
      vistaSeleccionada: vista,
      puntosActivos: activosKeys,
      puntosSeleccionados: activosLabels,
      seccionesExtra,
      rodilla,
    };

    // 5) Persistencia para módulos que leen directo del storage
    try {
      sessionStorage.setItem("rodilla_data", JSON.stringify(rodilla));
      sessionStorage.setItem("rodilla_seccionesExtra", JSON.stringify(seccionesExtra));
      sessionStorage.setItem(
        `rodilla_resumen_${lado.includes("izquierda") ? "izquierda" : "derecha"}`,
        JSON.stringify(resumen)
      );
    } catch {}

    onSave?.(r);
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
          boxShadow: T?.shadowMd || "0 8px 24px rgba(0,0,0,0.15)",
          background: T?.bg || "#f2f2f2",
        }}
      >
        <div style={{ paddingTop: "133.333%" }} />

        {/* Imagen base */}
        <img
          src={imgSrcFinal}
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

        {/* Overlay de puntos (SIEMPRE visibles) */}
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
        <Button type="button" outline onClick={handleVolver}>Volver</Button>
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
        border: "1px solid transparent",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        boxShadow: T?.shadowSm || "0 2px 6px rgba(0,0,0,0.12)",
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
  if (subtle) style = { background: "rgba(0,0,0,0.06)", color: T?.text || "#111", borderColor: "rgba(0,0,0,0.08)" };
  else if (outline) style = { background: "transparent", color: T?.text || "#111", borderColor: T?.border || "rgba(0,0,0,0.25)" };
  else style = { background: T?.primaryDark || "#111", color: T?.onPrimary || "#fff", borderColor: T?.primaryDark || "#111", boxShadow: T?.shadowMd || "0 6px 18px rgba(0,0,0,0.18)" };
  return (
    <button type={type} onClick={onClick} style={{ ...base, ...style }}>
      {children}
    </button>
  );
}

/* Marcador */
function Marker({ cx, cy, active, label, onClick }) {
  const r = 2.9;
  const textLen = Math.max(3, Math.min(30, (label || "").length));
  const padX = 2.2;
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
      <circle r={6.5} fill="transparent" />
      <circle
        r={r + 1.0}
        fill="none"
        stroke={THEME.markerStroke}
        strokeWidth="0.6"
        style={{ filter: `drop-shadow(0 0.5px 1.2px ${THEME.markerShadow || "rgba(0,0,0,0.18)"})` }}
      />
      <circle r={r - 1.0} fill={active ? THEME.dotActive : THEME.dotInactive} />
      {active && !!label && (
        <g transform={`translate(${-tagW / 2} ${-offsetY})`}>
          <rect
            x={0}
            y={-tagH}
            rx={1.6}
            ry={1.6}
            width={tagW}
            height={tagH}
            fill={T?.primaryDark || "rgba(17,17,17,0.92)"}
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
            fill={T?.onPrimary || "#fff"}
            style={{ letterSpacing: 0.2 }}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
