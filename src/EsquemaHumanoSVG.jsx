import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  return (
    <svg width="300" height="600" viewBox="0 0 300 600">
      {/* Cuerpo base */}
      <rect x="140" y="50" width="20" height="100" fill="#ccc" />
      <circle cx="150" cy="40" r="20" fill="#ccc" /> {/* cabeza */}

      {/* Punto: rodilla izquierda */}
      <circle
        cx="130"
        cy="200"
        r="10"
        fill="red"
        onClick={() => onSeleccionZona('rodillaIzquierda')}
      />
      <text x="110" y="205" fontSize="10" fill="black">Rodilla izq.</text>

      {/* Punto: rodilla derecha */}
      <circle
        cx="170"
        cy="200"
        r="10"
        fill="red"
        onClick={() => onSeleccionZona('rodillaDerecha')}
      />
      <text x="175" y="205" fontSize="10" fill="black">Rodilla der.</text>

      {/* Punto: cadera izquierda */}
      <circle
        cx="130"
        cy="150"
        r="10"
        fill="blue"
        onClick={() => onSeleccionZona('caderaIzquierda')}
      />
      <text x="100" y="155" fontSize="10" fill="black">Cadera izq.</text>

      {/* Punto: cadera derecha */}
      <circle
        cx="170"
        cy="150"
        r="10"
        fill="blue"
        onClick={() => onSeleccionZona('caderaDerecha')}
      />
      <text x="175" y="155" fontSize="10" fill="black">Cadera der.</text>

      {/* ✅ Punto nuevo: columna lumbar */}
      <circle
        cx="150"
        cy="120"
        r="10"
        fill="green"
        onClick={() => onSeleccionZona('columnaLumbar')}
      />
      <text x="160" y="125" fontSize="10" fill="black">Lumbar</text>
    </svg>
  );
}

export default EsquemaHumanoSVG;
