import React from "react";

/**
 * EsquemaToggleTabs
 * Props:
 *  - vista: "anterior" | "posterior"
 *  - onChange(vista)
 */
export default function EsquemaToggleTabs({ vista, onChange }) {
  const Tab = ({ id, label }) => (
    <button
      onClick={() => onChange?.(id)}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: "1px solid #cfd6e4",
        background: vista === id ? "#ffffff" : "#eef3ff",
        fontWeight: 600,
        marginRight: 8,
        cursor: "pointer",
      }}
      aria-pressed={vista === id}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
      <Tab id="anterior" label="Anterior" />
      <Tab id="posterior" label="Posterior" />
    </div>
  );
}
