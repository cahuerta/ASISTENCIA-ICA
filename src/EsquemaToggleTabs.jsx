import React from "react";

export default function EsquemaToggleTabs({ vista, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      {["anterior", "posterior"].map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange?.(key)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: vista === key ? "#0072CE" : "#fff",
            color: vista === key ? "#fff" : "#111827",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {key === "anterior" ? "Anterior" : "Posterior"}
        </button>
      ))}
    </div>
  );
}
