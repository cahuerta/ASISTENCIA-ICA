// src/mano/usehandstate.js
import { useState, useCallback } from "react";

/**
 * Estado mínimo para la marcación de mano.
 * - Punto: { x: number(0..1), y: number(0..1), key: string, selected?: boolean, label?: string }
 * - Solo togglear selección de puntos predispuestos.
 */
export function useHandState(initialPoints = []) {
  const [puntos, setPuntos] = useState(
    Array.isArray(initialPoints) ? initialPoints : []
  );

  // Click → activar / desactivar
  const togglePunto = useCallback((index) => {
    setPuntos((arr) =>
      arr.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  }, []);

  // Desactivar todos
  const clearSelection = useCallback(() => {
    setPuntos((arr) => arr.map((p) => ({ ...p, selected: false })));
  }, []);

  // Resetear (p. ej. al cambiar de vista/lado)
  const resetAll = useCallback(() => {
    setPuntos([]);
  }, []);

  return {
    puntos,
    setPuntos,   // se usa para precargar desde MANO_PUNTOS_BY_VISTA
    togglePunto, // click → toggle
    clearSelection,
    resetAll,
  };
}
