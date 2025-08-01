import React, { useState } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: '',
    rut: '',
    edad: '',
    dolor: '',
    lado: '',
  });
  const [textoVistaPrevia, setTextoVistaPrevia] = useState('');
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const texto = 
      `Nombre: ${datosPaciente.nombre}\n` +
      `RUT: ${datosPaciente.rut}\n` +
      `Edad: ${datosPaciente.edad} años\n` +
      `Dolor en: ${datosPaciente.dolor} ${datosPaciente.lado}`;

    setTextoVistaPrevia(texto);
    setMostrarVistaPrevia(true);
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await fetch('https://asistencia-ica-backend.onrender.com/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datosPaciente.nombre,
          edad: datosPaciente.edad,
          motivo: `Dolor de ${datosPaciente.dolor} ${datosPaciente.lado}`,
          lado: datosPaciente.lado,
        }),
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
      <div style={styles.esquemaContainer}>
        <EsquemaHumanoSVG
          dolor={datosPaciente.dolor}
          lado={datosPaciente.lado}
          onCambiarDato={handleCambiarDato}
        />
      </div>

      <div style={styles.formularioContainer}>
        <FormularioPaciente
          datos={datosPaciente}
          onCambiarDato={handleCambiarDato}
          onSubmit={handleSubmit}
        />

        {mostrarVistaPrevia && (
          <div style={styles.previewContainer}>
            <pre style={styles.preview}>{textoVistaPrevia}</pre>
            <button style={styles.downloadButton} onClick={handleDescargarPDF}>
              Descargar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: '40px',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f4f8',
    minHeight: '100vh',
  },
  esquemaContainer: {
    flex: '1',
    maxWidth: '400px',
  },
  formularioContainer: {
    flex: '1',
    maxWidth: '400px',
  },
  previewContainer: {
    marginTop: '20px',
  },
  preview: {
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '15px',
    whiteSpace: 'pre-wrap',
  },
  downloadButton: {
    marginTop: '15px',
    backgroundColor: '#0072CE',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%',
  },
};

export default App;
