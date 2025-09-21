// src/EsquemaToggleTabs.jsx
import React, { useMemo, useRef, useEffect } from "react";
import { getTheme } from "./theme.js";

const T = getTheme();

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

  const baseStyles = {
    container: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      border: `1px solid ${T.border ?? "#e5e7eb"}`,
      borderRadius: 10,
      padding: 4,
      background: T.surface ?? "#f9fafb",
    },
    tab: (selected) => ({
      padding: "8px 12px",
      borderRadius: 8,
      border: `1px solid ${T.border ?? "#d1d5db"}`,
      background: selected ? (T.primary ?? "#0072CE") : (T.bg ?? "#fff"),
      color: selected ? (T.onPrimary ?? "#fff") : (T.text ?? "#111827"),
      cursor: "pointer",
      fontWeight: 600,
      outline: "none",
    }),
    tabFocus: {
      // se aplica vía :focus-visible en navegadores modernos
      boxShadow: `0 0 0 3px ${T.accentAlpha ?? "rgba(0,114,206,0.35)"}`,
    },
  };

  return (
    <div
      className={className}
      role="tablist"
      aria-label="Cambiar vista del esquema"
      onKeyDown={onKeyDown}
      style={baseStyles.container}
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
            style={baseStyles.tab(selected)}
            onFocus={(e) => {
              // aplicar foco visible (fallback simple para navegadores sin :focus-visible)
              e.currentTarget.style.boxShadow = baseStyles.tabFocus.boxShadow;
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
