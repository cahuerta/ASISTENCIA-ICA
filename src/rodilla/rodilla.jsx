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
 *  - ladoInicial: "derecha" | "izquierda"
 *  - vistaInicial: "anterior" | "posterior" | "lateral"  (internamente "anterior" → "frente")
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
};

const BTN = "px-3 py-2 rounded-lg border text-sm";
const TAB = "px-3 py-1 rounded-md text-sm";

export default function RodillaMapper({
  ladoInicial = "derecha",
  vistaInicial = "anterior",
  onSave = () => {},
  onClose = () => {},
}) {
  // normaliza vista inicial ("anterior" -> "frente")
  const v0 = String(vistaInicial).toLowerCase();
  const [vista, setVista] = useState(v0 === "anterior" ? "frente" : v0); // "frente" | "posterior" | "lateral"
  const [lado, setLado] = useState(
    String(ladoInicial).toLowerCase() === "izquierda" ? "izquierda" : "derecha"
  );

  const { puntos, setPuntos } = useKneeState([]);

  // Precargar puntos predispuestos para la vista actual
  useEffect(() => {
    const base = RODILLA_PUNTOS_BY_VISTA[vista] || [];
    // { key, x, y } → estado: { x, y, key, selected:false }
    setPuntos(base.map((p) => ({ x: p.x, y: p.y, key: p.key, selected: false })));
  }, [vista, setPuntos]);

  const imgSrc = useMemo(() => {
    const key = `${lado}:${vista}`;
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
    };

    // fusiona (evita duplicados)
    const set = new Set([...(merged[vista] || []), ...labelsVista]);
    merged[vista] = Array.from(set);

    try {
      sessionStorage.setItem(SSKEY, JSON.stringify(merged));
    } catch {}

    // Callback ascendente
    onSave({
      modulo: "rodilla",
      lado,                         // "derecha" | "izquierda"
      vistaSeleccionada: vista,     // "frente" | "posterior" | "lateral"
      puntos: activos,              // solo los activados
    });
  };

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          Módulo Rodilla — puntos predispuestos (click = activar/desactivar)
        </div>
        <div className="flex items-center gap-2">
          <button
            className={BTN}
            onClick={() => setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })))}
          >
            Desactivar todos
          </button>
          <button className={`${BTN} bg-black text-white`} onClick={save}>
            Guardar / Enviar
          </button>
          <button className={BTN} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      {/* Controles de lado y vista */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {["derecha", "izquierda"].map((v) => (
            <button
              key={v}
              className={`${TAB} ${lado === v ? "bg-black text-white" : "border"}`}
              onClick={() => setLado(v)}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["frente", "posterior", "lateral"].map((v) => (
            <button
              key={v}
              className={`${TAB} ${vista === v ? "bg-black text-white" : "border"}`}
              onClick={() => setVista(v)}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-xs opacity-60">Un click en el punto: activar / desactivar.</span>
      </div>

      {/* Imagen PNG + overlay SVG */}
      <div className="relative w-full max-w-[720px] aspect-[3/4] border rounded-xl overflow-hidden">
        <img
          src={imgSrc}
          alt={`rodilla ${lado} ${vista}`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

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
    </div>
  );
}
