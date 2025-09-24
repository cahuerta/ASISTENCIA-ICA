// src/rodilla/rodilla.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { RODILLA_PUNTOS_BY_VISTA, RODILLA_LABELS } from "./rodillapuntos.js";
import { useKneeState } from "./usekneestate.js";

/**
 * RodillaMapper — PNG + SVG
 * - Puntos predispuestos (no se agregan ni mueven)
 * - Un click en el punto: activa/desactiva
 * - Sin textos, sin snap, sin drag, sin doble-click
 *
 * Props:
 *  - ladoInicial: "derecha" | "izquierda"   (SOLO MUESTRA, NO TOGGLE)
 *  - vistaInicial: "anterior" | "frontal" | "posterior" | "lateral" | "arriba"
 *      (internamente: "anterior"/"frontal" → "frente")
 *  - onSave(payload): { modulo:"rodilla", lado, vistaSeleccionada, puntos:[{id,x,y,key}] }
 *  - onClose(): cerrar
 */

const IMG_BY_KEY = {
  "derecha:frente": new URL("./rodillafrentederecha.jpg", import.meta.url).href,
  "izquierda:frente": new URL("./rodillafrenteizquierda.jpg", import.meta.url).href,
  "derecha:posterior": new URL("./rodillaposterieroderecha.jpg", import.meta.url).href,
  "izquierda:posterior": new URL("./rodillaposterieroderecha.jpg", import.meta.url).href, // misma base
  "derecha:lateral": new URL("./rodillalateral.jpg", import.meta.url).href,
  "izquierda:lateral": new URL("./rodillalateral.jpg", import.meta.url).href,
  // Nota: "arriba" usará la misma imagen que "frente" a menos que proveas archivos específicos.
};

const BTN = "px-3 py-2 rounded-lg border text-sm";
const TAB = "px-3 py-1.5 rounded-full text-sm border";

/** Mapea alias de vista del prop a la clave interna */
function normalizaVista(v) {
  const s = String(v || "").toLowerCase();
  if (s === "anterior" || s === "frontal" || s === "frente") return "frente";
  if (s === "posterior") return "posterior";
  if (s === "lateral") return "lateral";
  if (s === "arriba" || s === "superior") return "arriba";
  return "frente";
}

export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "frontal",
  onSave = () => {},
  onClose = () => {},
}) {
  // Vista interna normalizada: "frente" | "posterior" | "lateral" | "arriba"
  const [vista, setVista] = useState(normalizaVista(vistaInicial));

  // Lado detectado (SOLO DISPLAY)
  const lado = String(ladoInicial).toLowerCase() === "izquierda" ? "izquierda" : "derecha";

  const { puntos, setPuntos } = useKneeState([]);

  // Precargar puntos predispuestos para la vista actual (sin cambiar posiciones)
  useEffect(() => {
    const claveVista = vista === "arriba" ? "frente" : vista; // si no hay set dedicado para "arriba", usa "frente"
    const base = RODILLA_PUNTOS_BY_VISTA[claveVista] || [];
    setPuntos(base.map((p) => ({ x: p.x, y: p.y, key: p.key, selected: false })));
  }, [vista, setPuntos]);

  // Selección de imagen (si vista = "arriba", usa imagen de "frente" por defecto)
  const imgSrc = useMemo(() => {
    const vKey = vista === "arriba" ? "frente" : vista;
    const key = `${lado}:${vKey}`;
    return IMG_BY_KEY[key] || IMG_BY_KEY["derecha:frente"];
  }, [lado, vista]);

  // alternar activo/inactivo con un click
  const togglePoint = (idx) => {
    setPuntos((arr) =>
      arr.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
    );
  };

  const save = () => {
    // Solo puntos activados
    const activos = puntos
      .map((p, i) => ({ id: `p${i + 1}`, x: p.x, y: p.y, key: p.key, selected: p.selected }))
      .filter((p) => p.selected === true);

    // === Resumen legible por personas (por lado y vista) ===
    // Ej: sessionStorage["rodilla_resumen_derecha"] = { frente: ["Rótula", ...], posterior: [...], lateral: [...] }
    const SSKEY = `rodilla_resumen_${lado}`;
    let prev = {};
    try {
      const raw = sessionStorage.getItem(SSKEY);
      prev = raw ? JSON.parse(raw) : {};
    } catch {
      prev = {};
    }

    const labelsVista = activos
      .map((p) => RODILLA_LABELS[p.key] || p.key)
      .filter(Boolean);

    const merged = {
      frente: Array.isArray(prev.frente) ? prev.frente.slice() : [],
      posterior: Array.isArray(prev.posterior) ? prev.posterior.slice() : [],
      lateral: Array.isArray(prev.lateral) ? prev.lateral.slice() : [],
      arriba: Array.isArray(prev.arriba) ? prev.arriba.slice() : [],
    };

    const vistaKey = vista === "arriba" ? "arriba" : vista;
    const setUniq = new Set([...(merged[vistaKey] || []), ...labelsVista]);
    merged[vistaKey] = Array.from(setUniq);

    try {
      sessionStorage.setItem(SSKEY, JSON.stringify(merged));
    } catch {}

    // Callback ascendente
    onSave({
      modulo: "rodilla",
      lado,                         // "derecha" | "izquierda" (solo display, viene de la detección)
      vistaSeleccionada: vista,     // "frente" | "posterior" | "lateral" | "arriba"
      puntos: activos,              // solo los activados
    });
  };

  // Etiquetas de tabs (visual) sin toggle de lado
  const VISTA_BTNS = [
    { key: "arriba", label: "ARRIBA" },
    { key: "frente", label: "FRONTAL" }, // muestra "FRONTAL" aunque la clave interna sea "frente"
    { key: "lateral", label: "LATERAL" },
    { key: "posterior", label: "POSTERIOR" },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          Módulo Rodilla — puntos predispuestos (click = activar/desactivar)
        </div>

        {/* Lado detectado (solo etiqueta, NO toggle) */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60 hidden sm:inline">Lado detectado</span>
          <span className="px-2.5 py-1 rounded-full border text-xs font-semibold">
            {lado.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Controles de vista (tabs redondeados, mejor visual) */}
      <div className="flex items-center gap-2 flex-wrap">
        {VISTA_BTNS.map((b) => (
          <button
            key={b.key}
            className={`${TAB} ${
              vista === b.key ? "bg-black text-white border-black" : "bg-white text-black"
            }`}
            onClick={() => setVista(b.key)}
          >
            {b.label}
          </button>
        ))}
        <span className="text-xs opacity-60 ml-1">
          Un click en el punto: activar / desactivar.
        </span>
      </div>

      {/* Imagen PNG + overlay SVG */}
      <div className="relative w-full max-w-[720px] aspect-[3/4] border rounded-xl overflow-hidden">
        <img
          src={imgSrc}
          alt={`rodilla ${lado} ${vista}`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* El SVG se letterboxea igual que la imagen (meet), para que los puntos calcen */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {puntos.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x * 100}
              cy={p.y * 100}
              r={2.2}
              stroke="black"
              strokeWidth="0.7"
              fill={p.selected ? "black" : "white"}
              style={{ cursor: "pointer" }}
              onClick={() => togglePoint(idx)}
            />
          ))}
        </svg>
      </div>

      {/* Footer de acciones (debajo de la foto) */}
      <div className="flex items-center gap-2 mt-1">
        <button
          className={`${BTN}`}
          onClick={() => setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })))}
        >
          Desactivar todos
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button className={`${BTN} bg-black text-white`} onClick={save}>
            Guardar / Enviar
          </button>
          <button className={BTN} onClick={onClose}>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
