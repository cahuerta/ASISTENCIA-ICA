import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const handleClick = (zona) => {
    onSeleccionZona(zona);
  };

  return (
    <svg
      width="240"
      height="520"
      viewBox="0 0 240 520"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundColor: '#f5f8ff',
        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Cabeza */}
      <circle cx="120" cy="50" r="30" fill="#a0b8ff" stroke="#556abf" strokeWidth="2" />

      {/* Cuello */}
      <rect x="110" y="80" width="20" height="10" fill="#a0b8ff" />

      {/* Torso */}
      <rect x="90" y="90" width="60" height="120" rx="15" fill="#c0d1ff" stroke="#556abf" strokeWidth="2" />

      {/* Columna lumbar (centrada) */}
      <rect
        x="115"
        y="100"
        width="10"
        height="100"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Columna lumbar')}
        cursor="pointer"
      />
      <text x="130" y="170" fontSize="10" fill="#333">Columna</text>

      {/* Brazos */}
      <line x1="90" y1="100" x2="40" y2="230" stroke="#556abf" strokeWidth="14" strokeLinecap="round" />
      <line x1="150" y1="100" x2="200" y2="230" stroke="#556abf" strokeWidth="14" strokeLinecap="round" />

      {/* Piernas */}
      <line x1="100" y1="210" x2="100" y2="410" stroke="#556abf" strokeWidth="16" strokeLinecap="round" />
      <line x1="140" y1="210" x2="140" y2="410" stroke="#556abf" strokeWidth="16" strokeLinecap="round" />

      {/* Cadera izquierda */}
      <ellipse
        cx="100"
        cy="200"
        rx="12"
        ry="12"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Cadera izquierda')}
        cursor="pointer"
      />
      <text x="50" y="200" fontSize="10" fill="#333">Cadera izq.</text>

      {/* Cadera derecha */}
      <ellipse
        cx="140"
        cy="200"
        rx="14"
        ry="14"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Cadera derecha')}
        cursor="pointer"
      />
      <text x="160" y="245" fontSize="10" fill="#333">Cadera der.</text>

      {/* Rodilla izquierda */}
      <circle
        cx="100"
        cy="300"
        r="12"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Rodilla izquierda')}
        cursor="pointer"
      />
      <text x="40" y="430" fontSize="10" fill="#333">Rodilla izq.</text>

      {/* Rodilla derecha */}
      <circle
        cx="140"
        cy="300"
        r="12"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Rodilla derecha')}
        cursor="pointer"
      />
      <text x="160" y="300" fontSize="10" fill="#333">Rodilla der.</text>
    </svg>
  );
}

export default EsquemaHumanoSVG;
