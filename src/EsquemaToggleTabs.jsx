// src/EsquemaToggleTabs.jsx
"use client";
import React, { useMemo, useRef, useEffect } from "react";

/**
 * Toggle Anterior/Posterior accesible (tabs):
 * - Teclado: ← → para moverse, Home/End para ir al primero/último, Enter/Espacio para activar.
 * - ARIA: role="tablist"/"tab", aria-selected, aria-controls (si se proveen panelIds).
 *
 * Props:
 * - vista: "anterior" | "posterior"
 * - onChange: (key) => void
 * - className?: string
 * - idBase?: string (para generar ids predecibles)
 * - panelIds?: { anterior?: string; posterior?: string }  // opcional: ids del panel que controla cada tab
 */
export default function EsquemaToggleTabs({
  vista = "anterior",
  onChange,
  className = "",
  idBase = "esquema",
  panelIds,
}) {
  const tabs = useMemo(
    () => [
      { key: "anterior", label: "Anterior" },
      { key: "posterior", label: "Posterior" },
    ],
    []
  );

  const refs = useRef({});
  const activeIndex = tabs.findIndex((t) => t.key === vista);

  // Llevar el foco al tab activo si cambia la vista programáticamente
  useEffect(() => {
    const k = tabs[activeIndex]?.key;
    if (k && refs.current[k]) {
      refs.current[k].focus();
    }
  }, [vista, activeIndex, tabs]);

  const moveFocus = (nextIndex) => {
    const i = (nextIndex + tabs.length) % tabs.length; // wrap-around
    const k = tabs[i].key;
    refs.current[k]?.focus();
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moveFocus(activeIndex + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(activeIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        moveFocus(0);
        break;
      case "End":
        e.preventDefault();
        moveFocus(tabs.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        // Activar la pestaña que actualmente tiene foco
        const focused = document.activeElement?.getAttribute("data-key");
        if (focused && focused !== vista) onChange?.(focused);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`tabs ${className}`.trim()}
      role="tablist"
      aria-label="Cambiar vista del esquema"
      onKeyDown={onKeyDown}
    >
      {tabs.map(({ key, label }) => {
        const selected = vista === key;
        const tabId = `${idBase}-tab-${key}`;
        const panelId = panelIds?.[key];

        return (
          <button
            key={key}
            id={tabId}
            data-key={key}
            ref={(el) => (refs.current[key] = el)}
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            type="button"
            onClick={() => {
              if (!selected) onChange?.(key);
            }}
            className={`tab ${selected ? "active" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
