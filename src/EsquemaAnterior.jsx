import React from "react";

/** Vista frontal – ojos, caderas centradas, patelas. */
export default function EsquemaAnterior({
  onSeleccionZona,
  width = 240,
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
      aria-label="Vista anterior"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="skinA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d8c1" />
          <stop offset="100%" stopColor="#f0c9b0" />
        </linearGradient>
        <style>{`
          .outline{ fill:url(#skinA); stroke:#4c3b2e; stroke-width:3; stroke-linejoin:round; }
          .hint{ fill:none; stroke:#c29e86; stroke-width:2; }
          .hit{ fill:#3f6dd9; opacity:.20; cursor:pointer; }
          .hit:hover{ opacity:.32; }
        `}</style>
      </defs>

      {/* Cabeza con ojos */}
      <circle cx="120" cy="52" r="30" className="outline" />
      <circle cx="110" cy="50" r="3" fill="#3a2e26" />
      <circle cx="130" cy="50" r="3" fill="#3a2e26" />

      {/* Silueta frontal continua */}
      <path
        className="outline"
        d="M90 96h60c12 0 18 10 18 22v18c0 6-4 10-10 12v8c14 8 22 22 22 38v48
           c0 10-8 18-18 18H96c-10 0-18-8-18-18v-48c0-16 8-30 22-38v-8c-6-2-10-6-10-12v-18
           c0-12 6-22 18-22Z
           M82 182c-12 9-23 23-27 38l-10 34c-2 8 2 16 10 18 14 4 27-2 35-12l8-10
           M158 182c12 9 23 23 27 38l10 34c2 8-2 16-10 18-14 4-27-2-35-12l-8-10
           M98 242c-6 26-10 62-10 96v42c0 10 8 18 18 18h28c10 0 18-8 18-18v-42
           c0-34-4-70-10-96
           M96 398c-6 36-18 80-18 92 0 10 8 18 18 18h20c8 0 12-10 12-18v-16
           M144 398c6 36 18 80 18 92 0 10-8 18-18 18h-20c-8 0-12-10-12-18v-16"
      />

      {/* Referencias suaves */}
      <path className="hint" d="M100 154c8-6 32-6 40 0" />
      <ellipse className="hint" cx="100" cy="312" rx="10" ry="14" />
      <ellipse className="hint" cx="140" cy="312" rx="10" ry="14" />

      {/* Zonas clickeables */}
      <ellipse
        className="hit"
        cx="100"
        cy="222"
        rx="16"
        ry="16"
        onClick={() => handle("Cadera izquierda")}
      >
        <title>Cadera izquierda</title>
      </ellipse>

      <ellipse
        className="hit"
        cx="140"
        cy="222"
        rx="16"
        ry="16"
        onClick={() => handle("Cadera derecha")}
      >
        <title>Cadera derecha</title>
      </ellipse>

      <ellipse
        className="hit"
        cx="100"
        cy="312"
        rx="14"
        ry="14"
        onClick={() => handle("Rodilla izquierda")}
      >
        <title>Rodilla izquierda</title>
      </ellipse>

      <ellipse
        className="hit"
        cx="140"
        cy="312"
        rx="14"
        ry="14"
        onClick={() => handle("Rodilla derecha")}
      >
        <title>Rodilla derecha</title>
      </ellipse>
    </svg>
  );
}
