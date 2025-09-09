import React from "react";

/** Vista posterior – estilo mock; columna punteada, lumbar clickeable. */
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
          .outline{ fill:url(#skinP); stroke:#3b3028; stroke-width:3; stroke-linejoin:round; }
          .soft{ fill:none; stroke:#c49f87; stroke-width:2; stroke-linecap:round; }
          .spine{ stroke:#c49f87; stroke-width:3; stroke-linecap:round; stroke-dasharray:7 8; }
          .hit{ fill:#2f6bd8; opacity:.22; cursor:pointer; }
          .hit:hover{ opacity:.32; }
        `}</style>
      </defs>

      {/* cabeza posterior */}
      <circle cx="120" cy="52" r="30" className="outline" />

      {/* silueta posterior */}
      <path
        className="outline"
        d="M90 96h60c12 0 18 10 18 22v18c0 6-4 10-10 12v6c14 8 22 22 22 38v48
           c0 10-8 18-18 18H96c-10 0-18-8-18-18v-48c0-16 8-30 22-38v-6c-6-2-10-6-10-12v-18
           c0-12 6-22 18-22Z
           M82 182c-10 10-24 28-28 44l-10 34c-2 8 2 16 10 18 14 4 27-2 35-12l-10-12
           M158 182c10 10 24 28 28 44l10 34c2 8-2 16-10 18-14 4-27-2-35-12l-10-12
           M98 242c-6 26-10 62-10 96v42c0 10 8 18 18 18h28c10 0 18-8 18-18v-42
           c0-34-4-70-10-96
           M96 398c-6 36-18 80-18 92 0 10 8 18 18 18h20c8 0 12-10 12-18v-16
           M144 398c6 36 18 80 18 92 0 10-8 18-18 18h-20c-8 0-12-10-12-18v-16"
      />

      {/* referencias posteriores: columna y pequeñas marcas */}
      <line x1="120" y1="144" x2="120" y2="334" className="spine" />
      <path className="soft" d="M94 168c6-6 20-6 26 0" />
      <path className="soft" d="M120 168c6-6 20-6 26 0" />
      <path className="soft" d="M106 338c8 2 20 2 28 0" />

      {/* zonas clickeables */}
      <rect className="hit" x="108" y="246" width="24" height="78" rx="6" onClick={() => handle("Columna lumbar")}>
        <title>Columna lumbar</title>
      </rect>
      <ellipse className="hit" cx="100" cy="222" rx="16" ry="16" onClick={() => handle("Cadera izquierda")}>
        <title>Cadera izquierda</title>
      </ellipse>
      <ellipse className="hit" cx="140" cy="222" rx="16" ry="16" onClick={() => handle("Cadera derecha")}>
        <title>Cadera derecha</title>
      </ellipse>
      <ellipse className="hit" cx="100" cy="312" rx="14" ry="14" onClick={() => handle("Rodilla izquierda")}>
        <title>Rodilla izquierda</title>
      </ellipse>
      <ellipse className="hit" cx="140" cy="312" rx="14" ry="14" onClick={() => handle("Rodilla derecha")}>
        <title>Rodilla derecha</title>
      </ellipse>
    </svg>
  );
}
