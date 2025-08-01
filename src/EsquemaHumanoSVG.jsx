import React from 'react';

function EsquemaHumanoSVG({ dolor, lado, onCambiarDato }) {
  const colorActivo = '#0072CE';
  const colorInactivo = '#ddd';

  const seleccionarZona = (zona, ladoSeleccionado) => {
    onCambiarDato('dolor', zona);
    onCambiarDato('lado', ladoSeleccionado);
  };

  return (
    <div>
      <svg
        viewBox="0 0 200 500"
        width="280"
        height="500"
        xmlns="http://www.w3.org/2000/svg"
        style={{ background: '#f9f9f9', borderRadius: '12px', border: '1px solid #ccc' }}
      >
        {/* Cabeza */}
        <circle cx="100" cy="40" r="20" fill="#eee" stroke="#999" />

        {/* Tronco */}
        <rect x="80" y="60" width="40" height="100" fill="#eee" stroke="#999" />

        {/* Brazos */}
        <rect x="50" y="60" width="20" height="80" fill="#eee" stroke="#999" />
        <rect x="130" y="60" width="20" height="80" fill="#eee" stroke="#999" />

        {/* Caderas */}
        <rect x="80" y="160" width="40" height="30" fill="#ddd" stroke="#999" />

        {/* Piernas */}
        <rect x="80" y="190" width="15" height="100" fill="#eee" stroke="#999" />
        <rect x="105" y="190" width="15" height="100" fill="#eee" stroke="#999" />

        {/* Rodilla izquierda */}
        <circle
          cx="87.5"
          cy="250"
          r="10"
          fill={dolor === 'Rodilla' && lado === 'Izquierda' ? colorActivo : colorInactivo}
          stroke="#555"
          style={{ cursor: 'pointer' }}
          onClick={() => seleccionarZona('Rodilla', 'Izquierda')}
        />
        {/* Rodilla derecha */}
        <circle
          cx="112.5"
          cy="250"
          r="10"
          fill={dolor === 'Rodilla' && lado === 'Derecha' ? colorActivo : colorInactivo}
          stroke="#555"
          style={{ cursor: 'pointer' }}
          onClick={() => seleccionarZona('Rodilla', 'Derecha')}
        />

        {/* Cadera izquierda */}
        <circle
          cx="80"
          cy="175"
          r="10"
          fill={dolor === 'Cadera' && lado === 'Izquierda' ? colorActivo : colorInactivo}
          stroke="#555"
          style={{ cursor: 'pointer' }}
          onClick={() => seleccionarZona('Cadera', 'Izquierda')}
        />
        {/* Cadera derecha */}
        <circle
          cx="120"
          cy="175"
          r="10"
          fill={dolor === 'Cadera' && lado === 'Derecha' ? colorActivo : colorInactivo}
          stroke="#555"
          style={{ cursor: 'pointer' }}
          onClick={() => seleccionarZona('Cadera', 'Derecha')}
        />

        {/* Labels */}
        <text x="60" y="270" fontSize="10" fill="#333">Rodilla Izq.</text>
        <text x="120" y="270" fontSize="10" fill="#333">Rodilla Der.</text>
        <text x="35" y="180" fontSize="10" fill="#333">Cadera Izq.</text>
        <text x="125" y="180" fontSize="10" fill="#333">Cadera Der.</text>
      </svg>
      <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '8px' }}>
        Haz clic en las zonas para seleccionar dolor y lado.
      </p>
    </div>
  );
}

export default EsquemaHumanoSVG;
