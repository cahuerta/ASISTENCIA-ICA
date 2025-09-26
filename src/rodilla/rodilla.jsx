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
  chipColor:    T?.onPrimary
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
  posterior: { derecha: toUrl(imgPosteriorDerecha), izquierda: toUrl(imgPosteriorDerecha) }
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

export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frente",
  imagenSrc,
  onSave,
  onVolver,
}) {
  const lado = (ladoInicial || "").toLowerCase();
  const vistaInicialNorm = normVista(vistaInicial);
  const [vista, setVista] = useState(vistaInicialNorm);

  /* Estado de puntos */
  const {
    puntos,
    setPuntos,
    togglePunto,
    clearSelection
  } = useKneeState(puntosDeVista(vistaInicialNorm));

  /* Restaurar selección inicial */
  useEffect(() => {
    const persisted = loadPersisted(lado);
    if (persisted?.[vistaInicialNorm]?.length) {
      setPuntos((arr) => arr.map((p, i) => ({ ...p, selected: !!persisted[vistaInicialNorm][i] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Cambio de vista → base + persistido */
  useEffect(() => {
    const base = puntosDeVista(vista);
    const persisted = loadPersisted(lado);
    const withSelection = persisted?.[vista]?.length
      ? base.map((p, i) => ({ ...p, selected: !!persisted[vista][i] }))
      : base;
    setPuntos(withSelection);
  }, [vista, lado, setPuntos]);

  /* Persistir cambios por vista */
  useEffect(() => {
    const persisted = loadPersisted(lado) || { frente: [], lateral: [], posterior: [] };
    persisted[vista] = puntos.map((p) => !!p.selected);
    savePersisted(lado, persisted);
  }, [puntos, vista, lado]);

  const handleToggle = useCallback((index) => {
    togglePunto(index);
  }, [togglePunto]);

  const handleClearAll = useCallback(() => {
    setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })));
    savePersisted(lado, { frente: [], lateral: [], posterior: [] });
    try {
      sessionStorage.removeItem(`rodilla_resumen_${lado}`);
      sessionStorage.removeItem("rodilla_seccionesExtra");
      sessionStorage.removeItem("rodilla_data");
    } catch {}
  }, [lado, setPuntos]);

  const handleVolver = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof onVolver === "function") {
      onVolver();
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

  /* Puntos render */
  const puntosRender = useMemo(
    () => puntos.map((p) => ({
      ...p,
      cx: p.x * 100,
      cy: p.y * 100,
      labelText: p.label || p.key || "",
    })),
    [puntos]
  );

  /* Guardar (suma 3 vistas) */
  const handleSave = () => {
    const persisted = loadPersisted(lado) || { frente: [], lateral: [], posterior: [] };

    const labelsDe = (v) => {
      const base = (RODILLA_PUNTOS_BY_VISTA?.[v] || []);
      const flags = Array.isArray(persisted[v]) ? persisted[v] : [];
      const out = [];
      for (let i = 0; i < base.length; i++) {
        if (flags[i]) out.push(base[i].label || base[i].key);
      }
      return out;
    };

    const resumenPorVista = {
      frente: labelsDe("frente"),
      lateral: labelsDe("lateral"),
      posterior: labelsDe("posterior"),
    };

    const seccionesExtra = [];
    if (resumenPorVista.frente.length) {
      seccionesExtra.push({ title: "Rodilla — Vista Frontal", lines: resumenPorVista.frente });
    }
    if (resumenPorVista.lateral.length) {
      seccionesExtra.push({ title: "Rodilla — Vista Lateral", lines: resumenPorVista.lateral });
    }
    if (resumenPorVista.posterior.length) {
      seccionesExtra.push({ title: "Rodilla — Vista Posterior", lines: resumenPorVista.posterior });
    }

    const merged = [
      ...resumenPorVista.frente,
      ...resumenPorVista.lateral,
      ...resumenPorVista.posterior,
    ];
    const rodilla = {
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: merged,
      porVista: resumenPorVista,
      count: merged.length,
    };

    const r = {
      modulo: "rodilla",
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: merged,
      seccionesExtra,
      rodilla,
    };

    try {
      sessionStorage.setItem(`rodilla_resumen_${lado}`, JSON.stringify(resumenPorVista));
      sessionStorage.setItem("rodilla_data", JSON.stringify(rodilla));
      sessionStorage.setItem("rodilla_seccionesExtra", JSON.stringify(seccionesExtra));
    } catch {}

    onSave?.(r);
  };

  /* === Layout sizing reducido (para que todo entre en pantalla) === */
  const WRAP_MAX_W = 420;
  const BOX_HEIGHT = "min(60vh, 360px)"; // ajusta alto para pantallas pequeñas

  return (
    <div
      style={{
        width: "100%",
        maxWidth: WRAP_MAX_W,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Label del lado — alto contraste */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 0.3,
            padding: "8px 12px",
            borderRadius: 10,
            background: T?.primaryDark || "#0d47a1",
            color: T?.onPrimary || "#fff",
            border: `1px solid ${T?.primary || "#1976d2"}`,
            boxShadow: T?.shadowSm || "0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          {`Zona seleccionada: Rodilla — ${RODILLA_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Contenedor de imagen reducido (alto fijo responsive) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: BOX_HEIGHT,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: T?.shadowMd || "0 8px 24px rgba(0,0,0,0.15)",
          background: T?.bg || "#f2f2f2",
        }}
      >
        {/* Imagen base */}
        <img
          src={imgSrcFinal}
          alt={`Rodilla ${vista} ${lado}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          draggable={false}
        />

        {/* Tabs de vista (NO tocados) */}
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

      {/* Acciones — alto contraste y compactas */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        <Button type="button" subtle onClick={handleClearAll}>Desactivar todos</Button>
        <Button type="button" onClick={handleSave}>Guardar / Enviar</Button>
        <Button type="button" outline onClick={handleVolver}>Volver</Button>
      </div>
    </div>
  );
}

/* ===== UI helpers ===== */
function VistaChip({ active, onClick, label }) {
  // NO modificamos estilos de tabs para respetar tu pedido
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
  const base = {
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 750,
    fontSize: 13,
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "all .15s ease",
    minWidth: 120,
  };
  let style = {};
  if (subtle) {
    style = {
      background: "#f2f4f7",
      color: T?.text || "#111",
      borderColor: "#e5e7eb",
    };
  } else if (outline) {
    style = {
      background: "#fff",
      color: T?.primaryDark || "#0d47a1",
      borderColor: T?.primaryDark || "#0d47a1",
    };
  } else {
    style = {
      background: T?.primaryDark || "#0d47a1",
      color: T?.onPrimary || "#fff",
      borderColor: T?.primary || "#1976d2",
      boxShadow: T?.shadowMd || "0 4px 12px rgba(0,0,0,0.18)",
    };
  }
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
