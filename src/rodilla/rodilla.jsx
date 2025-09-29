// src/rodilla/rodilla.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/* Tema (solo paleta padre) */
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

/* Imágenes locales (solo derechas; izquierda se espeja) */
import imgFrenteDerecha from "./rodillafrentederecha.jpg";
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

/* Mapa imagen por vista (si lado = izquierda y vista = frente/posterior → espejo) */
const IMG = {
  frente: toUrl(imgFrenteDerecha),
  lateral: toUrl(imgLateral),
  posterior: toUrl(imgPosteriorDerecha),
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

  /* Imagen final + flag de espejo */
  const imgSrcFinal =
    (typeof imagenSrc === "string" && imagenSrc) ||
    IMG[vista] ||
    IMG.frente;

  const debeEspejar = (lado === "izquierda") && (vista === "frente" || vista === "posterior"));

  /* Puntos render (espejar cx cuando corresponde) */
  const puntosRender = useMemo(
    () => puntos.map((p) => {
      const rawCx = p.x * 100;
      const cx = debeEspejar ? (100 - rawCx) : rawCx;
      const cy = p.y * 100;
      return {
        ...p,
        cx,
        cy,
        labelText: p.label || p.key || "",
      };
    }),
    [puntos, debeEspejar]
  );

  /* Guardar (suma 3 vistas) — ROBUSTO A TIMING */
  const handleSave = () => {
    // 1) Tomamos lo persistido
    const persisted = loadPersisted(lado) || { frente: [], lateral: [], posterior: [] };

    // 2) Inyectamos la vista ACTUAL desde memoria (por si el useEffect aún no guardó)
    const persistedNow = {
      frente: Array.isArray(persisted.frente) ? [...persisted.frente] : [],
      lateral: Array.isArray(persisted.lateral) ? [...persisted.lateral] : [],
      posterior: Array.isArray(persisted.posterior) ? [...persisted.posterior] : [],
    };
    persistedNow[vista] = puntos.map((p) => !!p.selected);

    // 3) Función que mapea flags → labels por vista
    const labelsDe = (v) => {
      const base = (RODILLA_PUNTOS_BY_VISTA?.[v] || []);
      const flags = Array.isArray(persistedNow[v]) ? persistedNow[v] : [];
      const out = [];
      for (let i = 0; i < base.length; i++) {
        if (flags[i]) out.push(base[i].label || base[i].key);
      }
      return out;
    };

    // 4) Construimos resumen completo
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
      // Y persistimos también el snapshot corregido (por si el efecto no alcanzó)
      savePersisted(lado, persistedNow);
    } catch {}

    onSave?.(r);
  };

  /* === Tamaño (proporcional, 4:3, compacto) === */
  const WRAP_MAX_W = 480; // compacto pero cómodo

  return (
    <div className="card" style={{ width: "100%", maxWidth: WRAP_MAX_W, margin: "0 auto" }}>
      {/* Label del lado — chip alta visibilidad */}
      <div className="mt-8">
        <span className="chip active">
          {`Zona seleccionada: Rodilla — ${RODILLA_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Contenedor 4:3 con overlay (mantiene proporción exacta) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: T?.shadowMd || "0 8px 24px rgba(0,0,0,0.15)",
          background: T?.bg || "#f2f2f2",
          marginTop: 10,
        }}
      >
        {/* Ratio 4:3 */}
        <div style={{ paddingTop: "133.333%" }} />

        {/* Tabs de vista */}
        <div
          className="tabs"
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3,
            pointerEvents: "auto",
            marginBottom: 0,
            backdropFilter: "blur(6px)",
          }}
        >
          {["frente", "lateral", "posterior"].map((v) => (
            <button
              key={v}
              type="button"
              className={`tab ${vista === v ? "active" : ""}`}
              onClick={() => setVista(v)}
            >
              {VISTA_LABEL[v]}
            </button>
          ))}
        </div>

        {/* Imagen base (espejo por CSS inline si corresponde) */}
        <img
          src={imgSrcFinal}
          alt={`Rodilla ${vista} ${lado}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: debeEspejar ? "scaleX(-1)" : "none",
            transformOrigin: "center",
          }}
          draggable={false}
        />

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
      <div className="toolbar center mt-10">
        <button type="button" className="btn ghost" onClick={clearSelection}>
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

/* ===== UI helpers (compat con .tab/.btn) ===== */
function VistaChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab ${active ? "active" : ""}`}
      style={{ pointerEvents: "auto" }}
    >
      {label}
    </button>
  );
}

function Button({ children, onClick, outline, subtle, type = "button" }) {
  const cls = subtle ? "btn ghost" : outline ? "btn secondary" : "btn";
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* Marcador (SVG) — sin cambios de lógica ni paleta */
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
