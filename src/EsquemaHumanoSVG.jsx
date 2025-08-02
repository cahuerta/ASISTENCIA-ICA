import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const handleClick = (zona) => {
    if (onSeleccionZona) {
      onSeleccionZona(zona);
    }
  };

  return (
    <svg
      width="300"
      height="600"
      viewBox="0 0 300 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
    >
      {/* Cadera izquierda */}
      <rect
        x="90"
        y="300"
        width="60"
        height="60"
        fill="#0072CE"
        opacity="0.6"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('caderaIzquierda')}
      />
      <text x="120" y="340" textAnchor="middle" fill="#fff" fontSize="14" pointerEvents="none">
        Cadera Izq
      </text>

      {/* Cadera derecha */}
      <rect
        x="150"
        y="300"
        width="60"
        height="60"
        fill="#0072CE"
        opacity="0.6"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('caderaDerecha')}
      />
      <text x="180" y="340" textAnchor="middle" fill="#fff" fontSize="14" pointerEvents="none">
        Cadera Der
      </text>

      {/* Rodilla izquierda */}
      <rect
        x="90"
        y="400"
        width="60"
        height="60"
        fill="#0072CE"
        opacity="0.6"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('rodillaIzquierda')}
      />
      <text x="120" y="440" textAnchor="middle" fill="#fff" fontSize="14" pointerEvents="none">
        Rodilla Izq
      </text>

      {/* Rodilla derecha */}
      <rect
        x="150"
        y="400"
        width="60"
        height="60"
        fill="#0072CE"
        opacity="0.6"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('rodillaDerecha')}
      />
      <text x="180" y="440" textAnchor="middle" fill="#fff" fontSize="14" pointerEvents="none">
        Rodilla Der
      </text>

      {/* Columna lumbar */}
      <rect
        x="115"
        y="200"
        width="70"
        height="60"
        fill="#0072CE"
        opacity="0.6"
        style={{ cursor: 'pointer' }}
        onClick={() => handleClick('columnaLumbar')}
      />
      <text x="150" y="240" textAnchor="middle" fill="#fff" fontSize="14" pointerEvents="none">
        Columna Lumbar
      </text>

      {/* Figura base (simplificada para referencia) */}
      <rect
        x="120"
        y="100"
        width="60"
        height="100"
        fill="#aaa"
        opacity="0.3"
        pointerEvents="none"
      />
      <rect
        x="100"
        y="360"
        width="100"
        height="160"
        fill="#ccc"
        opacity="0.3"
        pointerEvents="none"
      />
    </svg>
  );
}

export default EsquemaHumanoSVG;
