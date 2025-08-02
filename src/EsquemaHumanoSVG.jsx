import React from 'react';

function EsquemaHumanoSVG({ onSeleccionZona }) {
  const zonas = [
    { id: 'columna_lumbar', label: 'Columna lumbar', x: 95, y: 180, width: 10, height: 60 },
    { id: 'cadera_izquierda', label: 'Cadera izq.', cx: 75, cy: 260, rx: 18, ry: 10 },
    { id: 'cadera_derecha', label: 'Cadera der.', cx: 125, cy: 260, rx: 18, ry: 10 },
    { id: 'rodilla_izquierda', label: 'Rodilla izq.', cx: 75, cy: 330, r: 12 },
    { id: 'rodilla_derecha', label: 'Rodilla der.', cx: 125, cy: 330, r: 12 },
  ];

  const handleClick = (id) => {
    const etiquetas = {
      columna_lumbar: 'Columna lumbar',
      cadera_izquierda: 'Cadera izquierda',
      cadera_derecha: 'Cadera derecha',
      rodilla_izquierda: 'Rodilla izquierda',
      rodilla_derecha: 'Rodilla derecha',
    };
    onSeleccionZona(etiquetas[id]);
  };

  return (
    <svg
      width="220"
      height="420"
      viewBox="0 0 200 420"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundColor: '#f8faff',
        borderRadius: 12,
        boxShadow: '0 0 12px rgba(0,0,0,0.08)',
        padding: '10px',
      }}
    >
      {/* Cabeza */}
      <circle cx="100" cy="40" r="25" fill="#a0b8ff" stroke="#556abf" strokeWidth="2" />

      {/* Cuello */}
      <rect x="92" y="65" width="16" height="10" fill="#a0b8ff" />

      {/* Torso */}
      <rect x="70" y="75" width="60" height="100" rx="20" ry="20" fill="#c0d1ff" stroke="#556abf" strokeWidth="2" />

      {/* Brazos */}
      <line x1="70" y1="85" x2="40" y2="170" stroke="#556abf" strokeWidth="8" strokeLinecap="round" />
      <line x1="130" y1="85" x2="160" y2="170" stroke="#556abf" strokeWidth="8" strokeLinecap="round" />

      {/* Piernas */}
      <line x1="85" y1="175" x2="85" y2="380" stroke="#556abf" strokeWidth="10" strokeLinecap="round" />
      <line x1="115" y1="175" x2="115" y2="380" stroke="#556abf" strokeWidth="10" strokeLinecap="round" />

      {/* Columna lumbar */}
      <rect
        x={zonas[0].x}
        y={zonas[0].y}
        width={zonas[0].width}
        height={zonas[0].height}
        fill="rgba(85, 106, 191, 0.25)"
        stroke="#556abf"
        strokeWidth="1"
        cursor="pointer"
        onClick={() => handleClick(zonas[0].id)}
      />
      <text x={zonas[0].x + 20} y={zonas[0].y + 30} fill="#333" fontSize="11">Columna lumbar</text>

      {/* Caderas */}
      {zonas.slice(1, 3).map((zona) => (
        <g key={zona.id}>
          <ellipse
            cx={zona.cx}
            cy={zona.cy}
            rx={zona.rx}
            ry={zona.ry}
            fill="rgba(85, 106, 191, 0.25)"
            stroke="#556abf"
            strokeWidth="1"
            cursor="pointer"
            onClick={() => handleClick(zona.id)}
          />
          <text
            x={zona.cx}
            y={zona.cy + 20}
            fontSize="11"
            textAnchor="middle"
            fill="#333"
          >
            {zona.label}
          </text>
        </g>
      ))}

      {/* Rodillas */}
      {zonas.slice(3).map((zona) => (
        <g key={zona.id}>
          <circle
            cx={zona.cx}
            cy={zona.cy}
            r={zona.r}
            fill="rgba(85, 106, 191, 0.25)"
            stroke="#556abf"
            strokeWidth="1"
            cursor="pointer"
            onClick={() => handleClick(zona.id)}
          />
          <text
            x={zona.cx}
            y={zona.cy + 20}
            fontSize="11"
            textAnchor="middle"
            fill="#333"
          >
            {zona.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default EsquemaHumanoSVG;
