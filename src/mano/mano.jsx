// src/mano/mano.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { MANO_PUNTOS_BY_VISTA, MANO_LABELS } from "./manopuntos.js";
import { useHandState } from "./usehandstate.js";

/* Tema (solo paleta padre) */
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

/* Imágenes locales base
   - PALMAR: base = IZQUIERDA  → para derecha se espeja
   - DORSAL: base = DERECHA    → para izquierda se espeja
*/
import imgPalmarIzquierda from "./manofrontalizquierda.png";
import imgDorsalDerecha from "./manodorsalderecha.jpg";

/* Helper: import → URL (Vite/Next) */
const toUrl = (img) => (typeof img === "string" ? img : img?.src || "");

/* Normaliza vista externa → interna */
function normVista(v) {
  const key = (v || "").toLowerCase();
  if (key === "palmar" || key === "anterior" || key === "frente" || key === "frontal") return "palmar";
  if (key === "dorsal" || key === "posterior") return "dorsal";
  return "palmar";
}

/* Mapa imagen por vista (ver notas de base) */
const IMG = {
  palmar: toUrl(imgPalmarIzquierda), // base = izquierda
  dorsal: toUrl(imgDorsalDerecha),   // base = derecha
};

/* Etiquetas tabs */
const VISTA_LABEL = { palmar: "PALMAR", dorsal: "DORSAL" };

/* Puntos base (visibles de inmediato) */
const puntosDeVista = (vista) =>
  (MANO_PUNTOS_BY_VISTA?.[vista] || []).map((p) => ({ ...p, selected: !!p.selected }));

/* === Persistencia en sessionStorage (por lado y vista) === */
const storageKey = (lado) => `mano:${lado}`;
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

export default function ManoMapper({
  ladoInicial = "derecha",
  vistaInicial = "palmar",
  imagenSrc,
  onSave,
  onVolver,
}) {
  const lado = (ladoInicial || "").toLowerCase();
  const vistaInicialNorm = normVista(vistaInicial);
  const [vista, setVista] = useState(vistaInicialNorm);

  /* Estado de puntos */
  const { puntos, setPuntos, togglePunto, clearSelection } = useHandState(puntosDeVista(vistaInicialNorm));

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
    const withSelection = persisted?.[vista]?.length ? base.map((p, i) => ({ ...p, selected: !!persisted[vista][i] })) : base;
    setPuntos(withSelection);
  }, [vista, lado, setPuntos]);

  /* Persistir cambios por vista */
  useEffect(() => {
    const persisted = loadPersisted(lado) || { palmar: [], dorsal: [] };
    persisted[vista] = puntos.map((p) => !!p.selected);
    savePersisted(lado, persisted);
  }, [puntos, vista, lado]);

  const handleToggle = useCallback((index) => {
    togglePunto(index);
  }, [togglePunto]);

  const handleClearAll = useCallback(() => {
    setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })));
    savePersisted(lado, { palmar: [], dorsal: [] });
    try {
      sessionStorage.removeItem(`mano_resumen_${lado}`);
      sessionStorage.removeItem("mano_seccionesExtra");
      sessionStorage.removeItem("mano_data");

      // Limpia compatibilidad y global
      sessionStorage.removeItem("manoMarcadores");
      const raw = sessionStorage.getItem("marcadores");
      const global = raw ? JSON.parse(raw) : {};
      if (global && global.mano) {
        global.mano = { palmar: [], dorsal: [] };
        sessionStorage.setItem("marcadores", JSON.stringify(global));
      }
    } catch {}
  }, [lado, setPuntos]);

  const handleVolver = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (typeof onVolver === "function") {
      onVolver();
      return;
    }
    try { window.dispatchEvent(new CustomEvent("mano:volver")); } catch {}
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      window.history.back();
      return;
    }
    if (typeof window !== "undefined") window.location.assign("/");
  }, [onVolver]);

  /* Imagen final */
  const imgSrcFinal =
    (typeof imagenSrc === "string" && imagenSrc) ||
    IMG[vista] ||
    IMG.palmar;

  // Palmar base = izquierda → espejar si lado = derecha
  // Dorsal base = derecha   → espejar si lado = izquierda
  const debeEspejar =
    (vista === "palmar" && lado === "derecha") ||
    (vista === "dorsal" && lado === "izquierda");

  /* Puntos render — espejo por coordenada (texto NO se espeja) */
  const puntosRender = useMemo(
    () =>
      puntos.map((p) => {
        const rawCx = p.x * 100;
        const cx = debeEspejar ? 100 - rawCx : rawCx;
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

  /* Guardar (suma 2 vistas) — robusto a timing */
  const handleSave = () => {
    // 1) Tomamos lo persistido
    const persisted = loadPersisted(lado) || { palmar: [], dorsal: [] };

    // 2) Inyectamos la vista ACTUAL desde memoria (por si el useEffect aún no guardó)
    const persistedNow = {
      palmar: Array.isArray(persisted.palmar) ? [...persisted.palmar] : [],
      dorsal: Array.isArray(persisted.dorsal) ? [...persisted.dorsal] : [],
    };
    persistedNow[vista] = puntos.map((p) => !!p.selected);

    // 3) Mapea flags → labels por vista
    const labelsDe = (v) => {
      const base = (MANO_PUNTOS_BY_VISTA?.[v] || []);
      const flags = Array.isArray(persistedNow[v]) ? persistedNow[v] : [];
      const out = [];
      for (let i = 0; i < base.length; i++) {
        if (flags[i]) out.push(base[i].label || base[i].key);
      }
      return out;
    };

    // 4) Resumen
    const resumenPorVista = {
      palmar: labelsDe("palmar"),
      dorsal: labelsDe("dorsal"),
    };

    // === NUEVO: persistencias que leen preview y backend ===
    try {
      // Legacy por región
      sessionStorage.setItem(
        "manoMarcadores",
        JSON.stringify({
          palmar: resumenPorVista.palmar,
          dorsal: resumenPorVista.dorsal,
        })
      );
      // Contenedor global "marcadores"
      const raw = sessionStorage.getItem("marcadores");
      const global = raw ? JSON.parse(raw) : {};
      global.mano = {
        palmar: resumenPorVista.palmar,
        dorsal: resumenPorVista.dorsal,
      };
      sessionStorage.setItem("marcadores", JSON.stringify(global));
    } catch {}

    const seccionesExtra = [];
    if (resumenPorVista.palmar.length) {
      seccionesExtra.push({ title: "Mano — Vista Palmar", lines: resumenPorVista.palmar });
    }
    if (resumenPorVista.dorsal.length) {
      seccionesExtra.push({ title: "Mano — Vista Dorsal", lines: resumenPorVista.dorsal });
    }

    const merged = [
      ...resumenPorVista.palmar,
      ...resumenPorVista.dorsal,
    ];

    const mano = {
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: merged,
      porVista: resumenPorVista,
      count: merged.length,
    };

    const r = {
      modulo: "mano",
      lado,
      vistaSeleccionada: vista,
      puntosSeleccionados: merged,
      seccionesExtra,
      mano,
    };

    try {
      sessionStorage.setItem(`mano_resumen_${lado}`, JSON.stringify(resumenPorVista));
      sessionStorage.setItem("mano_data", JSON.stringify(mano));
      sessionStorage.setItem("mano_seccionesExtra", JSON.stringify(seccionesExtra));
      // Persistimos snapshot corregido
      savePersisted(lado, persistedNow);
    } catch {}

    onSave?.(r);
  };

  /* === Tamaño (proporcional, 4:3, compacto) === */
  const WRAP_MAX_W = 480;

  return (
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: WRAP_MAX_W,
        margin: "0 auto",
      }}
    >
      {/* Label del lado — alto contraste (mantengo inline para no alterar contraste/overlay) */}
      <div className="mt-8">
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
          {`Zona seleccionada: Mano — ${MANO_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Contenedor 4:3 (proporción idéntica para que calcen los puntos) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: T?.shadowMd || "0 8px 24px rgba(0,0,0,0.15)",
          background: T?.bg || "#f2f2f2",
          marginTop: 8,
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
            backdropFilter: "blur(6px)",
          }}
        >
          {["palmar", "dorsal"].map((v) => (
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

        {/* Imagen base (solo la imagen se espeja cuando corresponde) */}
        <img
          src={imgSrcFinal}
          alt={`Mano ${vista} ${lado}`}
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

        {/* Overlay de puntos (NO espejado; coordenadas ya invertidas cuando toca) */}
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
        <button type="button" className="btn secondary" onClick={clearSelection}>
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

/* ===== UI helpers ===== */
function VistaChip({ active, onClick, label }) {
  // Ya no se usa directamente (reemplazado por .tab), pero lo dejo por compatibilidad
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
  // Compatibilidad: mapea a clases globales .btn
  const cls = `btn ${outline || subtle ? "secondary" : ""}`;
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* Marcador (sin cambios de lógica/medidas) */
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
          {/* Texto normal (no espejado) */}
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
