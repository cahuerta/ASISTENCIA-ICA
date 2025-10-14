// src/codo/codo.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { CODO_PUNTOS_BY_VISTA } from "./codopuntos.js";
import { useCodoState } from "./usecodostate.js";

/* Tema (paleta padre) */
import { getTheme } from "../theme.js";
const T = getTheme();
const THEME = {
  markerStroke: T?.primaryDark,
  dotInactive: T?.accentAlpha,
  dotActive: T?.primary,
  markerShadow: T?.overlay,
  chipBg: T?.accentAlpha,
  chipActiveBg: T?.primaryDark,
  chipColor: T?.onPrimary,
};

/* Imágenes locales base (derecho) */
import imgFrontalDerecha from "./codoanteriorderecho.png";
// OJO: nombre de archivo según repo: "codoposterioderecho.png"
import imgPosteriorDerecha from "./codoposteriorderecho.png";

/* Helper: import → URL (Vite/Next) */
const toUrl = (img) => (typeof img === "string" ? img : img?.src || "");

/* Normaliza vista externa → interna */
function normVista(v) {
  const key = (v || "").toLowerCase();
  if (["frontal", "anterior", "frente"].includes(key)) return "frontal";
  if (["posterior", "dorsal", "espalda"].includes(key)) return "posterior";
  return "frontal";
}

/* Mapa imagen por vista (ambas base = codo derecho) */
const IMG = {
  frontal: toUrl(imgFrontalDerecha),
  posterior: toUrl(imgPosteriorDerecha),
};

/* Etiquetas tabs */
const VISTA_LABEL = { frontal: "FRONTAL", posterior: "POSTERIOR" };

/* Puntos base */
const puntosDeVista = (vista) =>
  (CODO_PUNTOS_BY_VISTA?.[vista] || []).map((p) => ({ ...p, selected: !!p.selected }));

/* === Persistencia en sessionStorage === */
const storageKey = (lado) => `codo:${lado}`;
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

export default function CodoMapper({
  ladoInicial = "derecha",
  vistaInicial = "frontal",
  imagenSrc,
  onSave,
  onVolver,
}) {
  const lado = (ladoInicial || "").toLowerCase();
  const vistaInicialNorm = normVista(vistaInicial);
  const [vista, setVista] = useState(vistaInicialNorm);

  /* Estado de puntos */
  const { puntos, setPuntos, togglePunto, clearSelection } = useCodoState(
    puntosDeVista(vistaInicialNorm)
  );

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

  /* Persistir cambios */
  useEffect(() => {
    const persisted = loadPersisted(lado) || { frontal: [], posterior: [] };
    persisted[vista] = puntos.map((p) => !!p.selected);
    savePersisted(lado, persisted);
  }, [puntos, vista, lado]);

  const handleToggle = useCallback(
    (index) => {
      togglePunto(index);
    },
    [togglePunto]
  );

  const handleClearAll = useCallback(() => {
    setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })));
    savePersisted(lado, { frontal: [], posterior: [] });
    try {
      sessionStorage.removeItem(`codo_resumen_${lado}`);
      sessionStorage.removeItem("codo_seccionesExtra");
      sessionStorage.removeItem("codo_data");
    } catch {}
  }, [lado, setPuntos]);

  const handleVolver = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (typeof onVolver === "function") {
        onVolver();
        return;
      }
      try {
        window.dispatchEvent(new CustomEvent("codo:volver"));
      } catch {}
      if (typeof window !== "undefined" && window.history && window.history.length > 1) {
        window.history.back();
        return;
      }
      if (typeof window !== "undefined") window.location.assign("/");
    },
    [onVolver]
  );

  /* Imagen final */
  const imgSrcFinal = (typeof imagenSrc === "string" && imagenSrc) || IMG[vista] || IMG.frontal;

  // Espejo: ambas bases son DERECHA → para izquierda espejar en ambas vistas
  const debeEspejar = lado === "izquierda";

  /* Puntos render — espejo coordenadas */
  const puntosRender = useMemo(
    () =>
      puntos.map((p) => {
        const rawCx = p.x * 100;
        const cx = debeEspejar ? 100 - rawCx : rawCx;
        const cy = p.y * 100;
        return { ...p, cx, cy, labelText: p.label || p.key || "" };
      }),
    [puntos, debeEspejar]
  );

  /* Guardar (igual patrón) */
  const handleSave = () => {
    const persisted = loadPersisted(lado) || { frontal: [], posterior: [] };
    const persistedNow = {
      frontal: Array.isArray(persisted.frontal) ? [...persisted.frontal] : [],
      posterior: Array.isArray(persisted.posterior) ? [...persisted.posterior] : [],
    };
    persistedNow[vista] = puntos.map((p) => !!p.selected);

    const labelsDe = (v) => {
      const base = CODO_PUNTOS_BY_VISTA?.[v] || [];
      const flags = Array.isArray(persistedNow[v]) ? persistedNow[v] : [];
      const out = [];
      for (let i = 0; i < base.length; i++) if (flags[i]) out.push(base[i].label || base[i].key);
      return out;
    };

    const resumenPorVista = {
      frontal: labelsDe("frontal"),
      posterior: labelsDe("posterior"),
    };

    const seccionesExtra = [];
    if (resumenPorVista.frontal.length) {
      seccionesExtra.push({ title: "Codo — Vista Frontal", lines: resumenPorVista.frontal });
    }
    if (resumenPorVista.posterior.length) {
      seccionesExtra.push({ title: "Codo — Vista Posterior", lines: resumenPorVista.posterior });
    }

    const merged = [...resumenPorVista.frontal, ...resumenPorVista.posterior];

    const codo = {
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: merged,
      porVista: resumenPorVista,
      count: merged.length,
    };

    const r = {
      modulo: "codo",
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: merged,
      seccionesExtra,
      codo,
    };

    try {
      sessionStorage.setItem(`codo_resumen_${lado}`, JSON.stringify(resumenPorVista));
      sessionStorage.setItem("codo_data", JSON.stringify(codo));
      sessionStorage.setItem("codo_seccionesExtra", JSON.stringify(seccionesExtra));
      savePersisted(lado, persistedNow);
    } catch {}

    onSave?.(r);
  };

  /* === Tamaño (idéntico a los demás) === */
  const WRAP_MAX_W = 480;

  return (
    <div className="card" style={{ width: "100%", maxWidth: WRAP_MAX_W, margin: "0 auto" }}>
      {/* Encabezado con zona + instrucción */}
      <div className="mt-8" aria-live="polite">
        <div style={{ fontWeight: 800, marginBottom: 4 }}>{`Codo ${lado}:`}</div>
        <div className="muted">Presiona el punto que más se acerque a tu dolor.</div>
      </div>

      {/* Tabs de vista */}
      <div
        className="tabs"
        style={{
          display: "inline-flex",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          width: "100%",
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        {["frontal", "posterior"].map((v) => (
          <button
            key={v}
            type="button"
            className={`tab ${vista === v ? "active" : ""}`}
            onClick={() => setVista(v)}
            style={{ pointerEvents: "auto" }}
            aria-pressed={vista === v}
          >
            {VISTA_LABEL[v]}
          </button>
        ))}
      </div>

      {/* Imagen + Overlay */}
      <div className="figure ratio-4x3 mt-4" style={{ position: "relative" }}>
        <div className="ratio-inner" />
        <img
          src={imgSrcFinal}
          alt={`Codo ${vista} ${lado}`}
          className="ratio-img"
          style={{
            transform: debeEspejar ? "scaleX(-1)" : "none",
            transformOrigin: "center",
            zIndex: 0,
          }}
          draggable={false}
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="ratio-overlay"
          style={{ pointerEvents: "auto", zIndex: 2 }}
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
      <div className="toolbar center mt-10">
        <button type="button" className="btn ghost" onClick={handleClearAll}>
          Desactivar todos
        </button>
        <button type="button" className="btn" onClick={handleSave}>
          Guardar / Enviar
        </button>
        <button type="button" className="btn secondary" onClick={handleVolver}>
          Volver
        </button>
      </div>
    </div>
  );
}

/* ===== Marcador (idéntico) ===== */
function Marker({ cx, cy, active, label, onClick }) {
  const r = 2.0;
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
    >
      <circle r={6.5} fill="transparent" />
      <circle
        r={r + 1.0}
        fill="none"
        stroke={THEME.markerStroke}
        strokeWidth="0.6"
        style={{
          filter: `drop-shadow(0 0.5px 1.2px ${THEME.markerShadow || "rgba(0,0,0,0.18)"})`,
        }}
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
