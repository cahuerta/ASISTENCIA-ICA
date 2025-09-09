import React from "react";

/** Vista posterior, con cabello y columna punteada; lumbar clickeable solo aquí */
export default function EsquemaPosterior({
  onSeleccionZona,
  width = 260,
  className = "",
}) {
  const handle = (z) => typeof onSeleccionZona === "function" && onSeleccionZona(z);

  return (
    <svg
      viewBox="0 0 240 520"
      width={width}
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vista posterior"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="skinP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d8c1" />
          <stop offset="100%" stopColor="#f0c9b0" />
        </linearGradient>
        <style>{`
          .outline{ fill:url(#skinP); stroke:#4c3b2e; stroke-width:3; }
          .hint{ fill:none; stroke:#c29e86; stroke-width:2; }
          .spine{ stroke:#c29e86; stroke-width:3; stroke-dasharray:6 6; }
          .hit{ fill:#3f6dd9; opacity:.20; cursor:pointer; }
          .hit:hover{ opacity:.30; }
        `}</style>
      </defs>

      {/* Cabeza + cabello posterior tipo bob (como mock) */}
      <circle cx="120" cy="52" r="30" className="outline" />
      <path d="M92 42c6-10 16-16 28-16s22 6 28 16v24c0 10-12 18-28 18s-28-8-28-18V42z" fill="#6b4f3a" />

      {/* Silueta posterior */}
      <path
        className="outline"
        d="M90 96h60c12 0 18 10 18 22v18c0 6-4 10-10 12v6c14 8 22 22 22 38v48c0 10-8 18-18 18H96c-10 0-18-8-18-18v-48c0-16 8-30 22-38v-6c-6-2-10-6-10-12v-18c0-12 6-22 18-22Z
           M82 182c-10 10-24 28-28 44l-10 34c-2 8 2 16 10 18 14 4 27-2 35-12l-10-12
           M158 182c10 10 24 28 28 44l10 34c2 8-2 16-10 18-14 4-27-2-35-12l-10-12
           M98 242c-6 26-10 62-10 96v42c0 10 8 18 18 18h28c10 0 18-8 18-18v-42c0-34-4-70-10-96
           M96 398c-6 36-18 80-18 92 0 10 8 18 18 18h20c8 0 12-10 12-18v-16
           M144 398c6 36 18 80 18 92 0 10-8 18-18 18h-20c-8 0-12-10-12-18v-16"
      />

      {/* Columna punteada (dorsal-sacra) */}
      <line x1="120" y1="144" x2="120" y2="334" className="spine" />

      {/* Zonas clickeables */}
      {/* Lumbar (solo posterior) */}
      <rect className="hit" x="108" y="246" width="24" height="78" rx="6" onClick={() => handle("Columna lumbar")}>
        <title>Columna lumbar</title>
      </rect>

      {/* Caderas centradas */}
      <ellipse className="hit" cx="100" cy="222" rx="16" ry="16" onClick={() => handle("Cadera izquierda")}>
        <title>Cadera izquierda</title>
      </ellipse>
      <ellipse className="hit" cx="140" cy="222" rx="16" ry="16" onClick={() => handle("Cadera derecha")}>
        <title>Cadera derecha</title>
      </ellipse>

      {/* Rodillas */}
      <ellipse className="hit" cx="100" cy="312" rx="14" ry="14" onClick={() => handle("Rodilla izquierda")}>
        <title>Rodilla izquierda</title>
      </ellipse>
      <ellipse className="hit" cx="140" cy="312" rx="14" ry="14" onClick={() => handle("Rodilla derecha")}>
        <title>Rodilla derecha</title>
      </ellipse>
    </svg>
  );
}
