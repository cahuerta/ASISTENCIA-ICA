import React from "react";

/**
 * EsquemaAnterior – cuerpo completo (vista frontal)
 * Zonas clickeables: Cadera izq/der, Rodilla izq/der
 * Props:
 *  - onSeleccionZona(zona: string)
 *  - width (por defecto 240)  // alto escala automáticamente
 *  - className (opcional)
 */
export default function EsquemaAnterior({
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
      aria-label="Esquema humano vista anterior"
    >
      <defs>
        <linearGradient id="skinAnterior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d8c1" />
          <stop offset="100%" stopColor="#f0c9b0" />
        </linearGradient>
        <style>{`
          .outline{ fill:url(#skinAnterior); stroke:#7a5a44; stroke-width:3; }
          .hint{ fill:none; stroke:#c29e86; stroke-width:2; }
          .hit{ fill:#6c8cff; opacity:.18; cursor:pointer; }
          .hit:hover{ opacity:.28; }
        `}</style>
      </defs>

      {/* Cabeza + rostro sencillo (ojos) */}
      <g>
        <circle cx="120" cy="50" r="30" className="outline" />
        {/* ojos */}
        <circle cx="110" cy="50" r="3" fill="#4a3a2f" />
        <circle cx="130" cy="50" r="3" fill="#4a3a2f" />
      </g>

      {/* Tronco/brazos/piernas – silueta frontal */}
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

           M78 180c-12 10-24 24-28 40l-10 36
           c-2 8 2 16 10 18
           c15 4 28-2 36-12l8-10

           M162 180c12 10 24 24 28 40l10 36
           c2 8-2 16-10 18
           c-15 4-28-2-36-12l-8-10

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

      {/* Referencias óseas simples (tórax + patelas) */}
      <path className="hint" d="M100 152c8-6 32-6 40 0" />
      <ellipse className="hint" cx="100" cy="310" rx="10" ry="14" />
      <ellipse className="hint" cx="140" cy="310" rx="10" ry="14" />

      {/* ZONAS CLICKEABLES (centradas en acetábulo y patelas) */}
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
