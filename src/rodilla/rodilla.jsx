// src/rodilla/rodilla.jsx
"use client";
import React, { useMemo, useRef, useState } from "react";

/**
 * RodillaMapper (PNG + SVG overlay, SIN snap, SOLO puntos)
 *
 * Requiere en esta carpeta:
 *  - rodillafrentederecha.jpg
 *  - rodillafrenteizquierda.jpg
 *  - rodillaposterieroderecha.jpg   (se usa también para izquierda-posterior)
 *  - rodillalateral.jpg
 *
 * Props:
 *  - ladoInicial: "derecha" | "izquierda"
 *  - vistaInicial: "anterior" | "posterior" | "lateral"
 *  - onSave(payload): callback con {modulo, lado, vistaSeleccionada, puntos:[{x,y}]}
 *  - onClose(): cerrar modal
 */

const IMG_BY_KEY = {
  "derecha:frente": new URL("./rodillafrentederecha.jpg", import.meta.url).href,
  "izquierda:frente": new URL("./rodillafrenteizquierda.jpg", import.meta.url).href,
  "derecha:posterior": new URL("./rodillaposterieroderecha.jpg", import.meta.url).href,
  "izquierda:posterior": new URL("./rodillaposterieroderecha.jpg", import.meta.url).href,
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
  const [vista, setVista] = useState(v0 === "anterior" ? "frente" : v0);
  const [lado, setLado] = useState(String(ladoInicial).toLowerCase() === "izquierda" ? "izquierda" : "derecha");

  const [puntos, setPuntos] = useState([]); // [{x:0..1, y:0..1}]
  const boxRef = useRef(null);

  const imgSrc = useMemo(() => {
    const key = `${lado}:${vista}`;
    return IMG_BY_KEY[key] || IMG_BY_KEY["derecha:frente"];
  }, [lado, vista]);

  // click en SVG -> agrega punto (coords normalizadas)
  function addPointFromEvent(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPuntos((arr) => [...arr, { x: clamp01(x), y: clamp01(y) }]);
  }

  function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function removePoint(i) {
    setPuntos((arr) => arr.filter((_, idx) => idx !== i));
  }

  function resetAll() {
    setPuntos([]);
  }

  function save() {
    onSave({
      modulo: "rodilla",
      lado,                         // "derecha" | "izquierda"
      vistaSeleccionada: vista,     // "frente" | "posterior" | "lateral"
      puntos: puntos.map((p, i) => ({ id: `p${i + 1}`, x: p.x, y: p.y })),
    });
  }

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Módulo Rodilla — PNG + SVG (solo puntos)</div>
        <div className="flex items-center gap-2">
          <button className={BTN} onClick={resetAll}>Reiniciar</button>
          <button className={`${BTN} bg-black text-white`} onClick={save}>Guardar / Enviar IA</button>
          <button className={BTN} onClick={onClose}>Cerrar</button>
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
        <span className="text-xs opacity-60">Click sobre la imagen para añadir puntos. (Sin validaciones)</span>
      </div>

      {/* Contenedor imagen PNG + overlay SVG */}
      <div
        ref={boxRef}
        className="relative w-full max-w-[720px] aspect-[3/4] border rounded-xl overflow-hidden"
      >
        <img
          src={imgSrc}
          alt={`rodilla ${lado} ${vista}`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* SVG overlay */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          onClick={addPointFromEvent}
        >
          {/* puntos */}
          {puntos.map((p, i) => (
            <g key={i}>
              <circle cx={p.x * 100} cy={p.y * 100} r={1.8} stroke="black" strokeWidth="0.6" fill="white" />
              {/* botón borrar (pequeña X) */}
              <text
                x={p.x * 100 + 2.8}
                y={p.y * 100 - 2.8}
                fontSize="4"
                fill="black"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={(e) => { e.stopPropagation(); removePoint(i); }}
              >
                ×
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Lista simple de puntos (opcional) */}
      <div className="w-full max-w-[720px] text-xs opacity-70">
        {puntos.length === 0 ? "Sin puntos aún." : (
          <ul className="list-disc pl-4">
            {puntos.map((p, i) => (
              <li key={i}>#{i + 1} — x: {p.x.toFixed(3)}, y: {p.y.toFixed(3)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
