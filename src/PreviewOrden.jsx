import React from 'react';

function PreviewOrden({ datos }) {
  const { nombre, rut, edad, dolor, lado } = datos;

  const textoOrden =
    dolor === 'Rodilla'
      ? edad < 50
        ? `Resonancia magnética de rodilla ${lado.toLowerCase()}`
        : `Radiografía de rodilla ${lado.toLowerCase()} AP y lateral de pie`
      : dolor === 'Cadera'
      ? edad < 50
        ? `Resonancia magnética de cadera ${lado.toLowerCase()}`
        : `Radiografía de pelvis AP de pie`
      : dolor === 'Columna lumbar'
      ? 'Resonancia magnética de columna lumbar'
      : 'Examen imagenológico no especificado';

  return (
    <div style={styles.container}>
      <div style={styles.logo}>
        <h2 style={{ color: '#0072CE', margin: 0 }}>Instituto de Cirugía Articular</h2>
      </div>

      <h3 style={styles.title}>Orden Médica de Examen Imagenológico</h3>

      <div style={styles.info}>
        <p>
          <strong>Nombre:</strong> {nombre}
        </p>
        <p>
          <strong>RUT:</strong> {rut}
        </p>
        <p>
          <strong>Edad:</strong> {edad} años
        </p>
        <p>
          <strong>Motivo / Diagnóstico:</strong> Dolor de {dolor} {lado}
        </p>
      </div>

      <div style={styles.orden}>
        <strong>Orden médica solicitada:</strong>
        <p style={{ marginTop: 4 }}>{textoOrden}</p>
      </div>

      <div style={styles.firma}>
        <hr style={{ width: '60%', margin: '20px auto' }} />
        <p style={{ textAlign: 'center', margin: 0 }}>Firma médico tratante</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    border: '1.5px solid #0072CE',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f9fbff',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#002663',
  },
  logo: {
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    color: '#004a99',
    marginBottom: 20,
    fontWeight: '700',
  },
  info: {
    fontSize: 16,
    lineHeight: 1.5,
    marginBottom: 20,
  },
  orden: {
    fontSize: 17,
    backgroundColor: '#d9e6ff',
    padding: 15,
    borderRadius: 8,
  },
  firma: {
    marginTop: 30,
  },
};

export default PreviewOrden;
