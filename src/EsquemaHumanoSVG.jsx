import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const zonas = [
    { id: 'columna_lumbar', label: 'Columna lumbar', x: 140, y: 170, width: 20, height: 100 },
    { id: 'cadera_izquierda', label: 'Cadera Izquierda', cx: 110, cy: 300, rx: 40, ry: 30 },
    { id: 'cadera_derecha', label: 'Cadera Derecha', cx: 190, cy: 300, rx: 40, ry: 30 },
    { id: 'rodilla_izquierda', label: 'Rodilla Izquierda', cx: 110, cy: 400, r: 30 },
    { id: 'rodilla_derecha', label: 'Rodilla Derecha', cx: 190, cy: 400, r: 30 },
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
      width="320"
      height="620"
      viewBox="0 0 320 620"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: '#e6f0ff', borderRadius: 12, boxShadow: '0 0 12px rgba(0,0,0,0.15)' }}
    >
      {/* Cabeza */}
      <circle cx="160" cy="40" r="30" fill="#5490ff" stroke="#2a4d9f" strokeWidth="3" />
      <text x="160" y="45" textAnchor="middle" fill="#e0eaff" fontSize="14" fontWeight="700" pointerEvents="none">
        Cabeza
      </text>

      {/* Torso */}
      <rect x="130" y="70" width="60" height="150" fill="#9cc3ff" stroke="#2a4d9f" strokeWidth="3" rx="20" ry="20" />

      {/* Zonas clickeables */}
      <rect
        x={zonas[0].x}
        y={zonas[0].y}
        width={zonas[0].width}
        height={zonas[0].height}
        fill="#3166cc"
        stroke="#1f3a75"
        strokeWidth="2"
        cursor="pointer"
        onClick={() => handleClick(zonas[0].id)}
      />
      <text
        x={zonas[0].x + zonas[0].width / 2}
        y={zonas[0].y + 20}
        fill="#cbdcff"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[0].label}
      </text>

      <ellipse
        cx={zonas[1].cx}
        cy={zonas[1].cy}
        rx={zonas[1].rx}
        ry={zonas[1].ry}
        fill="#4571d9"
        stroke="#2b488f"
        strokeWidth="2"
        cursor="pointer"
        onClick={() => handleClick(zonas[1].id)}
      />
      <text
        x={zonas[1].cx}
        y={zonas[1].cy + 5}
        fill="#e0eaff"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[1].label}
      </text>

      <ellipse
        cx={zonas[2].cx}
        cy={zonas[2].cy}
        rx={zonas[2].rx}
        ry={zonas[2].ry}
        fill="#4571d9"
        stroke="#2b488f"
        strokeWidth="2"
        cursor="pointer"
        onClick={() => handleClick(zonas[2].id)}
      />
      <text
        x={zonas[2].cx}
        y={zonas[2].cy + 5}
        fill="#e0eaff"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[2].label}
      </text>

      <circle
        cx={zonas[3].cx}
        cy={zonas[3].cy}
        r={zonas[3].r}
        fill="#2e4aa5"
        stroke="#1c2f62"
        strokeWidth="2"
        cursor="pointer"
        onClick={() => handleClick(zonas[3].id)}
      />
      <text
        x={zonas[3].cx}
        y={zonas[3].cy + 5}
        fill="#c9d7ff"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        pointerEvents="none"
      >
        {zonas[3].label}
      </text>

      <circle
        cx={zonas[4].cx}
        cy={zonas[4].cy}
        r={zonas[4].r}
        fill="#2e4aa5"
        stroke="#1c2f62"
        strokeWidth="2"
        cursor="pointer"
        onClick={() => handleClick(zonas[4].id)}
      />
      <text
        x={zonas[4].cx}
        y={zonas[4].cy + 5}
        fill="#c9d7ff"
        fontSize="14"
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
