import React from "react";

/**
 * EsquemaPosterior – cuerpo completo (vista posterior)
 * Zonas clickeables: Columna lumbar (solo aquí), Cadera izq/der, Rodilla izq/der.
 * Incluye cabello posterior para identificación.
 * Props:
 *  - onSeleccionZona(zona: string)
 *  - width (por defecto 240)
 *  - className (opcional)
 */
export default function EsquemaPosterior({
  onSeleccionZona,
  width = 240,
  className = "",
}) {
  const handle = (zona) => typeof onSeleccionZona === "function" && onSeleccionZona(zona);

  return (
    <svg
      viewBox="0 0 240 520"
      width={width}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      aria-label="Esquema humano vista posterior"
    >
      <defs>
        <linearGradient id="skinPosterior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d8c1" />
          <stop offset="100%" stopColor="#f0c9b0" />
        </linearGradient>
        <style>{`
          .outline{ fill:url(#skinPosterior); stroke:#7a5a44; stroke-width:3; }
          .hint{ fill:none; stroke:#c29e86; stroke-width:2; }
          .hit{ fill:#6c8cff; opacity:.18; cursor:pointer; }
          .hit:hover{ opacity:.28; }
          .spine{ stroke:#c29e86; stroke-width:3; stroke-dasharray:6 6; }
        `}</style>
      </defs>

      {/* Cabeza + cabello posterior */}
      <g>
        <circle cx="120" cy="50" r="30" className="outline" />
        {/* cabello simple posterior */}
        <path
          d="M90 50c0 0 8-18 30-18s30 18 30 18v18c0 8-10 16-30 16s-30-8-30-16V50z"
          fill="#6b4f3a"
        />
      </g>

      {/* Silueta posterior */}
      <path
        className="outline"
        d="M120 80
           c20 0 30 12 30 26v10
           c0 6-4 10-10 12v6
           c14 8 22 22 22 38v50
           c0 10-8 18-18 18H96
           c-10 0-18-8-18-18v-50
           c0-16 8-30 22-38v-6
           c-6-2-10-6-10-12V106
           c0-14 10-26 30-26z

           M78 180c-10 10-24 28-28 44l-10 34
           c-2 8 2 16 10 18
           c15 4 28-2 36-12l-10-12

           M162 180c10 10 24 28 28 44l10 34
           c2 8-2 16-10 18
           c-15 4-28-2-36-12l-10-12

           M98 240c-6 26-10 62-10 96v44
           c0 10 8 18 18 18h28
           c10 0 18-8 18-18v-44
           c0-34-4-70-10-96

           M96 398c-6 36-18 80-18 92
           c0 10 8 18 18 18h20
           c8 0 12-10 12-18v-16

           M144 398c6 36 18 80 18 92
           c0 10-8 18-18 18h-20
           c-8 0-12-10-12-18v-16"
      />

      {/* Línea de referencia de columna */}
      <line x1="120" y1="140" x2="120" y2="330" className="spine" />

      {/* ZONAS CLICKEABLES (posterior) */}
      {/* Columna lumbar (solo posterior) */}
      <rect
        className="hit"
        x="108"
        y="240"
        width="24"
        height="80"
        rx="6"
        onClick={() => handle("Columna lumbar")}
      >
        <title>Columna lumbar</title>
      </rect>

      {/* Caderas centradas (más mediales) */}
      <ellipse
        className="hit"
        cx="100"
        cy="220"
        rx="16"
        ry="16"
        onClick={() => handle("Cadera izquierda")}
      >
        <title>Cadera izquierda</title>
      </ellipse>
      <ellipse
        className="hit"
        cx="140"
        cy="220"
        rx="16"
        ry="16"
        onClick={() => handle("Cadera derecha")}
      >
        <title>Cadera derecha</title>
      </ellipse>

      {/* Rodillas */}
      <ellipse
        className="hit"
        cx="100"
        cy="310"
        rx="14"
        ry="14"
        onClick={() => handle("Rodilla izquierda")}
      >
        <title>Rodilla izquierda</title>
      </ellipse>
      <ellipse
        className="hit"
        cx="140"
        cy="310"
        rx="14"
        ry="14"
        onClick={() => handle("Rodilla derecha")}
      >
        <title>Rodilla derecha</title>
      </ellipse>
    </svg>
  );
}
