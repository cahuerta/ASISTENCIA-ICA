// src/rodilla/usekneestate.js
import { useState, useCallback } from "react";

/**
 * Estado mínimo para la marcación de rodilla.
 * - Estructura de punto: { x: number(0..1), y: number(0..1), selected?: boolean }
 * - Sin nombres, sin validaciones, sin snap. SOLO puntos.
 */
export function useKneeState(initialPoints = []) {
  const [puntos, setPuntos] = useState(
    Array.isArray(initialPoints) ? initialPoints : []
  );

  const addPunto = useCallback((p) => {
    // p: { x, y, selected? }
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") return;
    const nx = clamp01(p.x);
    const ny = clamp01(p.y);
    setPuntos((arr) => [...arr, { x: nx, y: ny, selected: !!p.selected }]);
  }, []);

  const updatePunto = useCallback((index, patch) => {
    setPuntos((arr) => {
      if (index < 0 || index >= arr.length) return arr;
      const prev = arr[index];
      const next = {
        ...prev,
        ...patch,
      };
      // clamp si vienen x/y
      if (typeof next.x === "number") next.x = clamp01(next.x);
      if (typeof next.y === "number") next.y = clamp01(next.y);
      const copy = arr.slice();
      copy[index] = next;
      return copy;
    });
  }, []);

  const removePunto = useCallback((index) => {
    setPuntos((arr) => arr.filter((_, i) => i !== index));
  }, []);

  const clearSelection = useCallback(() => {
    setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })));
  }, []);

  const selectOnly = useCallback((index) => {
    setPuntos((arr) =>
      arr.map((p, i) => ({ ...p, selected: i === index }))
    );
  }, []);

  const resetAll = useCallback(() => {
    setPuntos([]);
  }, []);

  return {
    puntos,
    setPuntos,       // por si necesitas control total
    addPunto,
    updatePunto,
    removePunto,
    clearSelection,
    selectOnly,
    resetAll,
  };
}

/* ===== helpers ===== */
function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
