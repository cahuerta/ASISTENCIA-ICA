
import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const handleClick = (zona) => {
    onSeleccionZona(zona);
  };

  return (
    <svg
      width="200"
      height="500"
      viewBox="0 0 200 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundColor: '#f8faff',
        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Cabeza */}
      <circle cx="100" cy="40" r="25" fill="#a0b8ff" stroke="#556abf" strokeWidth="2" />

      {/* Cuello */}
      <rect x="90" y="65" width="20" height="10" fill="#a0b8ff" />

      {/* Torso */}
      <rect x="70" y="75" width="60" height="110" rx="15" fill="#c0d1ff" stroke="#556abf" strokeWidth="2" />

      {/* Columna lumbar (centrada en el dorso del torso) */}
      <rect
        x="95"
        y="140"
        width="10"
        height="40"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        strokeWidth="1"
        onClick={() => handleClick('Columna lumbar')}
        cursor="pointer"
      />
      <text x="105" y="160" fontSize="10" fill="#333" textAnchor="start">
        Columna
      </text>

      {/* Caderas */}
      <ellipse
        cx="80"
        cy="200"
        rx="18"
        ry="10"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Cadera izquierda')}
        cursor="pointer"
      />
      <text x="60" y="215" fontSize="10" fill="#333">Cadera izq.</text>

      <ellipse
        cx="120"
        cy="200"
        rx="18"
        ry="10"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Cadera derecha')}
        cursor="pointer"
      />
      <text x="120" y="215" fontSize="10" fill="#333">Cadera der.</text>

      {/* Piernas */}
      <line x1="85" y1="210" x2="85" y2="340" stroke="#556abf" strokeWidth="12" strokeLinecap="round" />
      <line x1="115" y1="210" x2="115" y2="340" stroke="#556abf" strokeWidth="12" strokeLinecap="round" />

      {/* Rodillas */}
      <circle
        cx="85"
        cy="350"
        r="12"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Rodilla izquierda')}
        cursor="pointer"
      />
      <text x="55" y="355" fontSize="10" fill="#333">Rodilla izq.</text>

      <circle
        cx="115"
        cy="350"
        r="12"
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        onClick={() => handleClick('Rodilla derecha')}
        cursor="pointer"
      />
      <text x="120" y="355" fontSize="10" fill="#333">Rodilla der.</text>
    </svg>
  );
}

export default EsquemaHumanoSVG;
