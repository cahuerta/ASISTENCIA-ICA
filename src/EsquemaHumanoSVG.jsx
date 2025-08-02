import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const zonas = [
    { id: 'columna_lumbar', label: 'Columna lumbar', x: 95, y: 180, width: 10, height: 80 },
    { id: 'cadera_izquierda', label: 'Cadera Izquierda', cx: 70, cy: 280, rx: 25, ry: 15 },
    { id: 'cadera_derecha', label: 'Cadera Derecha', cx: 130, cy: 280, rx: 25, ry: 15 },
    { id: 'rodilla_izquierda', label: 'Rodilla Izquierda', cx: 70, cy: 400, r: 20 },
    { id: 'rodilla_derecha', label: 'Rodilla Derecha', cx: 130, cy: 400, r: 20 },
  ];

  const handleClick = (id) => {
    switch (id) {
      case 'columna_lumbar':
        onSeleccionZona('Columna lumbar');
        break;
      case 'cadera_izquierda':
        onSeleccionZona('Cadera izquierda');
        break;
      case 'cadera_derecha':
        onSeleccionZona('Cadera derecha');
        break;
      case 'rodilla_izquierda':
        onSeleccionZona('Rodilla izquierda');
        break;
      case 'rodilla_derecha':
        onSeleccionZona('Rodilla derecha');
        break;
      default:
        break;
    }
  };

  return (
    <svg
      width="200"
      height="520"
      viewBox="0 0 200 520"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: '#f5f8ff', borderRadius: 12, boxShadow: '0 0 12px rgba(0,0,0,0.1)' }}
    >
      {/* Cabeza */}
      <circle cx="100" cy="60" r="40" fill="#a0b8ff" stroke="#556abf" strokeWidth="2" />
      <text x="100" y="70" textAnchor="middle" fill="#eef3ff" fontSize="14" fontWeight="700" pointerEvents="none">
        Cabeza
      </text>

      {/* Cuello */}
      <rect x="90" y="100" width="20" height="20" fill="#a0b8ff" />

      {/* Torso */}
      <rect x="70" y="120" width="60" height="150" rx="20" ry="30" fill="#c0d1ff" stroke="#556abf" strokeWidth="2" />

      {/* Brazos */}
      <line x1="70" y1="130" x2="20" y2="250" stroke="#556abf" strokeWidth="14" strokeLinecap="round" />
      <line x1="130" y1="130" x2="180" y2="250" stroke="#556abf" strokeWidth="14" strokeLinecap="round" />

      {/* Piernas */}
      <line x1="90" y1="270" x2="90" y2="460" stroke="#556abf" strokeWidth="18" strokeLinecap="round" />
      <line x1="110" y1="270" x2="110" y2="460" stroke="#556abf" strokeWidth="18" strokeLinecap="round" />

      {/* Zonas clickeables */}

      {/* Columna lumbar (rectángulo) */}
      <rect
        x={zonas[0].x}
        y={zonas[0].y}
        width={zonas[0].width}
        height={zonas[0].height}
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        strokeWidth="1"
        cursor="pointer"
        onClick={() => handleClick(zonas[0].id)}
      />
      <text
        x={zonas[0].x + zonas[0].width / 2}
        y={zonas[0].y + 20}
        fill="#4f5a82"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[0].label}
      </text>

      {/* Cadera izquierda (elipse) */}
      <ellipse
        cx={zonas[1].cx}
        cy={zonas[1].cy}
        rx={zonas[1].rx}
        ry={zonas[1].ry}
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        strokeWidth="1"
        cursor="pointer"
        onClick={() => handleClick(zonas[1].id)}
      />
      <text
        x={zonas[1].cx}
        y={zonas[1].cy + 5}
        fill="#4f5a82"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[1].label}
      </text>

      {/* Cadera derecha (elipse) */}
      <ellipse
        cx={zonas[2].cx}
        cy={zonas[2].cy}
        rx={zonas[2].rx}
        ry={zonas[2].ry}
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        strokeWidth="1"
        cursor="pointer"
        onClick={() => handleClick(zonas[2].id)}
      />
      <text
        x={zonas[2].cx}
        y={zonas[2].cy + 5}
        fill="#4f5a82"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[2].label}
      </text>

      {/* Rodilla izquierda (círculo) */}
      <circle
        cx={zonas[3].cx}
        cy={zonas[3].cy}
        r={zonas[3].r}
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        strokeWidth="1"
        cursor="pointer"
        onClick={() => handleClick(zonas[3].id)}
      />
      <text
        x={zonas[3].cx}
        y={zonas[3].cy + 5}
        fill="#4f5a82"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[3].label}
      </text>

      {/* Rodilla derecha (círculo) */}
      <circle
        cx={zonas[4].cx}
        cy={zonas[4].cy}
        r={zonas[4].r}
        fill="rgba(85, 106, 191, 0.3)"
        stroke="#556abf"
        strokeWidth="1"
        cursor="pointer"
        onClick={() => handleClick(zonas[4].id)}
      />
      <text
        x={zonas[4].cx}
        y={zonas[4].cy + 5}
        fill="#4f5a82"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[4].label}
      </text>
    </svg>
  );
}

export default EsquemaHumanoSVG;
