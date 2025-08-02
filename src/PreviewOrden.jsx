import React from 'react';

function PreviewOrden({ datos }) {
  if (!datos.nombre) {
    return null;
  }

  const { nombre, rut, edad, dolor, lado } = datos;

  // Determinar orden médica según dolor, lado y edad
  let orden = '';
  if (dolor === 'Rodilla') {
    orden =
      edad < 50
        ? `Resonancia magnética de rodilla ${lado.toLowerCase()}`
        : `Radiografía de rodilla ${lado.toLowerCase()} AP y lateral de pie`;
  } else if (dolor === 'Cadera') {
    orden =
      edad < 50
        ? `Resonancia magnética de cadera ${lado.toLowerCase()}`
        : `Radiografía de pelvis AP de pie`;
  } else if (dolor === 'Columna lumbar') {
    orden = 'Resonancia magnética de columna lumbar';
  } else {
    orden = 'Examen imagenológico no especificado';
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Vista Previa de la Orden Médica</h2>
      <div style={styles.section}>
        <strong>Nombre:</strong> {nombre}
      </div>
      <div style={styles.section}>
        <strong>RUT:</strong> {rut}
      </div>
      <div style={styles.section}>
        <strong>Edad:</strong> {edad} años
      </div>
      <div style={styles.section}>
        <strong>Motivo / Diagnóstico:</strong> Dolor de {dolor} {lado}
      </div>
      <div style={{ ...styles.section, marginTop: '20px' }}>
        <strong>Orden médica solicitada:</strong>
        <p style={styles.orden}>{orden}</p>
      </div>
      <div style={{ marginTop: '60px', textAlign: 'center' }}>
        _____________________________
        <br />
        Firma médico tratante
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '400px',
    marginTop: '20px',
  },
  title: {
    textAlign: 'center',
    color: '#0072CE',
    marginBottom: '15px',
  },
  section: {
    marginBottom: '10px',
    fontSize: '14px',
    color: '#333',
  },
  orden: {
    marginTop: '5px',
    fontWeight: 'bold',
    color: '#0072CE',
  },
};

export default PreviewOrden;
