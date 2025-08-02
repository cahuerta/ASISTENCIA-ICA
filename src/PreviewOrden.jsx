import React from 'react';

function PreviewOrden({ datos }) {
  if (!datos || !datos.nombre || !datos.dolor) return null;

  let orden = '';

  if (datos.dolor === 'Rodilla') {
    orden =
      parseInt(datos.edad) < 50
        ? `Resonancia magnética de rodilla ${datos.lado.toLowerCase()}`
        : `Radiografía de rodilla ${datos.lado.toLowerCase()} AP y lateral de pie`;
  } else if (datos.dolor === 'Cadera') {
    orden =
      parseInt(datos.edad) < 50
        ? `Resonancia magnética de cadera ${datos.lado.toLowerCase()}`
        : `Radiografía de pelvis AP de pie`;
  } else if (datos.dolor === 'Columna lumbar') {
    orden = 'Resonancia magnética de columna lumbar';
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Instituto de Cirugía Articular</h2>
        <p style={styles.sub}>Orden médica</p>
      </div>

      <div style={styles.section}>
        <p><strong>Nombre:</strong> {datos.nombre}</p>
        <p><strong>RUT:</strong> {datos.rut}</p>
        <p><strong>Edad:</strong> {datos.edad}</p>
      </div>

      <div style={styles.section}>
        <p><strong>Se solicita:</strong></p>
        <p style={styles.orden}>{orden}</p>
      </div>

      <div style={styles.firma}>
        <p>_____________________________</p>
        <p>Médico tratante</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '30px',
    maxWidth: '600px',
    margin: '20px auto',
    fontFamily: 'Arial, sans-serif',
    color: '#333',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    color: '#0072CE',
  },
  sub: {
    margin: 0,
    fontSize: '16px',
  },
  section: {
    marginBottom: '20px',
  },
  orden: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '5px',
  },
  firma: {
    textAlign: 'center',
    marginTop: '40px',
    fontSize: '14px',
  },
};

export default PreviewOrden;
