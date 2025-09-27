// src/mano/mano.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { MANO_PUNTOS_BY_VISTA, MANO_LABELS } from "./manopuntos.js";
import { useHandState } from "./usehandstate.js";

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

/* Imágenes locales base
   - PALMAR: base = IZQUIERDA  → para derecha se espeja
   - DORSAL: base = DERECHA    → para izquierda se espeja
*/
import imgPalmarIzquierda from "./manofrontalizquierda.png";
import imgDorsalDerecha   from "./manodorsalderecha.jpg";

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
  const {
    puntos,
    setPuntos,
    togglePunto,
    clearSelection
  } = useHandState(puntosDeVista(vistaInicialNorm));

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

  /* Imagen final + flag de espejo según base explicada arriba */
  const imgSrcFinal =
    (typeof imagenSrc === "string" && imagenSrc) ||
    IMG[vista] ||
    IMG.palmar;

  // Palmar base = izquierda → espejar si lado = derecha
  // Dorsal base = derecha   → espejar si lado = izquierda
  const debeEspejar =
    (vista === "palmar" && lado === "derecha") ||
    (vista === "dorsal" && lado === "izquierda");

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
            boxShadow: T?.shadowSm || "0 2px 8px rgba(0,0,0,0.18)`,
          }}
        >
          {`Zona seleccionada: Mano — ${MANO_LABELS?.[lado] || lado}`}
        </span>
      </div>

      {/* Contenedor 4:3 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: T?.shadowMd || "0 8px 24px rgba(0,0,0,0.15)`,
          background: T?.bg || "#f2f2f2",
        }}
      >
        {/* Ratio 4:3 */}
        <div style={{ paddingTop: "133.333%" }} />

        {/* Imagen base (espejo por CSS si corresponde) */}
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
          {["palmar", "dorsal"].map((v) => (
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        <Button type="button" subtle onClick={clearSelection}>Desactivar todos</Button>
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
