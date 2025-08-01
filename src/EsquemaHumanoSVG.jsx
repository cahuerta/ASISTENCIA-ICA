import React from 'react';

function EsquemaHumanoSVG({ dolor, lado, onCambiarDato }) {
  // Colores para destacar zona de dolor
  const colorActivo = '#0072CE';
  const colorInactivo = '#ccc';

  // Función para manejar click en zona dolorosa
  const manejarClickZona = (zona) => {
    if (zona === dolor) {
      onCambiarDato('dolor', ''); // Desactivar si es la misma zona
    } else {
      onCambiarDato('dolor', zona);
    }
  };

  // Función para cambiar lado (derecha / izquierda)
  const manejarClickLado = (seleccion) => {
    if (seleccion === lado) {
      onCambiarDato('lado', '');
    } else {
      onCambiarDato('lado', seleccion);
    }
  };

  return (
    <div>
      <svg
        width="300"
        height="600"
        viewBox="0 0 300 600"
        xmlns="http://www.w3.org/2000/svg"
        style={{ border: '1px solid #ccc', borderRadius: '10px' }}
      >
        {/* Cuerpo básico (simplificado) */}
        <rect x="120" y="100" width="60" height="200" fill="#eee" stroke="#999" />
        
        {/* Rodilla derecha */}
        <circle
          cx="180"
          cy="320"
          r="30"
          fill={dolor === 'Rodilla' && lado === 'Derecha' ? colorActivo : colorInactivo}
          stroke="#999"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            manejarClickZona('Rodilla');
            manejarClickLado('Derecha');
          }}
        />
        <text x="180" y="320" textAnchor="middle" dy="5" fill="#000" style={{ pointerEvents: 'none', fontWeight: 'bold' }}>
          Rodilla D
        </text>

        {/* Rodilla izquierda */}
        <circle
          cx="120"
          cy="320"
          r="30"
          fill={dolor === 'Rodilla' && lado === 'Izquierda' ? colorActivo : colorInactivo}
          stroke="#999"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            manejarClickZona('Rodilla');
            manejarClickLado('Izquierda');
          }}
        />
        <text x="120" y="320" textAnchor="middle" dy="5" fill="#000" style={{ pointerEvents: 'none', fontWeight: 'bold' }}>
          Rodilla I
        </text>

        {/* Cadera derecha */}
        <ellipse
          cx="190"
          cy="180"
          rx="40"
          ry="30"
          fill={dolor === 'Cadera' && lado === 'Derecha' ? colorActivo : colorInactivo}
          stroke="#999"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            manejarClickZona('Cadera');
            manejarClickLado('Derecha');
          }}
        />
        <text x="190" y="180" textAnchor="middle" dy="5" fill="#000" style={{ pointerEvents: 'none', fontWeight: 'bold' }}>
          Cadera D
        </text>

        {/* Cadera izquierda */}
        <ellipse
          cx="110"
          cy="180"
          rx="40"
          ry="30"
          fill={dolor === 'Cadera' && lado === 'Izquierda' ? colorActivo : colorInactivo}
          stroke="#999"
