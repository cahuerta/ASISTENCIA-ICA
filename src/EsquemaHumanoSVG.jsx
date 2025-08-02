import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const handleClick = (zona) => {
    onSeleccionZona(zona);
  };

  return (
    <svg
      width="300"
      height="600"
      viewBox="0 0 300 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: '#f9f9f9', borderRadius: 8 }}
    >
      {/* Cuerpo */}
      <rect x="120" y="50" width="60" height="150" fill="#cce5ff" rx="20" ry="20" />
      {/* Cabeza */}
      <circle cx="150" cy="30" r="25" fill="#99ccff" />

      {/* Columna lumbar */}
      <rect
        x="140"
        y="170"
        width="20"
        height="100"
        fill="#80b3ff"
        stroke="#004080"
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('Columna lumbar')}
      />
      <text
        x="150"
        y="190"
        fill="#003366"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        pointerEvents="none"
      >
        Columna lumbar
      </text>

      {/* Cadera izquierda */}
      <ellipse
        cx="110"
        cy="300"
        rx="40"
        ry="30"
        fill="#4a90e2"
        stroke="#003366"
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('Cadera izquierda')}
      />
      <text
        x="110"
        y="305"
        fill="#e0eefe"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        pointerEvents="none"
      >
        Cadera Izquierda
      </text>

      {/* Cadera derecha */}
      <ellipse
        cx="190"
        cy="300"
        rx="40"
        ry="30"
        fill="#4a90e2"
        stroke="#003366"
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('Cadera derecha')}
      />
      <text
        x="190"
        y="305"
        fill="#e0eefe"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        pointerEvents="none"
      >
        Cadera Derecha
      </text>

      {/* Rodilla izquierda */}
      <circle
        cx="110"
        cy="400"
        r="30"
        fill="#2a5cad"
        stroke="#001f4d"
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('Rodilla izquierda')}
      />
      <text
        x="110"
        y="405"
        fill="#cbdcff"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        pointerEvents="none"
      >
        Rodilla Izquierda
      </text>

      {/* Rodilla derecha */}
      <circle
        cx="190"
        cy="400"
        r="30"
        fill="#2a5cad"
        stroke="#001f4d"
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('Rodilla derecha')}
      />
      <text
        x="190"
        y="405"
        fill="#cbdcff"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
        pointerEvents="none"
      >
        Rodilla Derecha
      </text>
    </svg>
  );
}

export default EsquemaHumanoSVG;
