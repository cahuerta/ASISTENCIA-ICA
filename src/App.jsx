import React, { useState } from 'react';

function App() {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [edad, setEdad] = useState('');
  const [dolor, setDolor] = useState('');
  const [lado, setLado] = useState('');
  const [textoVistaPrevia, setTextoVistaPrevia] = useState('');
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [datosPDF, setDatosPDF] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const texto = 
      `Nombre: ${nombre}\n` +
      `RUT: ${rut}\n` +
      `Edad: ${edad} años\n` +
      `Dolor en: ${dolor} ${lado}`;

    setTextoVistaPrevia(texto);
    setMostrarVistaPrevia(true);

    setDatosPDF({
      nombre: nombre,
      edad: edad,
      motivo: `Dolor de ${dolor} ${lado}`
    });
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await fetch('https://asistencia-ica-backend.onrender.com/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPDF),
      });

      if (!res.ok) {
        throw new Error('Error al generar el PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orden_resonancia.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('No se pudo generar el PDF.');
      console.error(error);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Asistente Virtual para Pacientes</h1>

        <label style={styles.label}>Nombre completo:</label>
        <input
          style={styles.input}
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label style={styles.label}>RUT:</label>
        <input
          style={styles.input}
          type="text"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          placeholder="12.345.678-9"
          required
        />

        <label style={styles.label}>Edad:</label>
        <input
          style={styles.input}
          type="number"
          min="18"
          max="110"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          required
        />

        <label style={styles.label}>Dolor (Rodilla o Cadera):</label>
        <select
          style={styles.input}
          value={dolor}
          onChange={(e) => setDolor(e.target.value)}
          required
        >
          <option value="">Seleccione...</option>
          <option value="Rodilla">Rodilla</option>
          <option value="Cadera">Cadera</option>
        </select>

        <label style={styles.label}>Lado:</label>
        <select
          style={styles.input}
          value={lado}
          onChange={(e) => setLado(e.target.value)}
          required
        >
          <option value="">Seleccione...</option>
          <option value="Derecha">Derecha</option>
          <option value="Izquierda">Izquierda</option>
        </select>

        <button style={styles.button} type="submit">Generar Informe</button>
      </form>

      {mostrarVistaPrevia && (
        <div style={styles.previewContainer}>
          <pre style={styles.preview}>{textoVistaPrevia}</pre>
          <button style={styles.downloadButton} onClick={handleDescargarPDF}>Descargar PDF</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: '#f0f4f8',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  form: {
    background: 'white',
    padding: '30px 40px',
    borderRadius: '10px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    width: '350px',
    textAlign: 'center',
  },
  title: {
    marginBottom: '20px',
    color: '#0072CE',
  },
  label: {
    display: 'block',
    marginTop: '15px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    marginTop: '5px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    boxSizing: 'border-box',
    fontSize: '14px',
  },
  button: {
    marginTop: '25px',
    background: '#0072CE',
    color: 'white',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.3s ease',
  },
  previewContainer: {
    marginTop: '30px',
    maxWidth: '600px',
    textAlign: 'left',
  },
  preview: {
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '20px',
    whiteSpace: 'pre-wrap',
  },
  downloadButton: {
    display: 'block',
    marginTop: '15px',
    background: '#0072CE',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%',
  },
};

export default App;
