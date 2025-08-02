import React, { useState } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: '',
    rut: '',
    edad: '',
    dolor: '',
    lado: '',
  });

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  const onSeleccionZona = (zona) => {
    // Mapear zona a dolor y lado
    let dolor = '';
    let lado = '';

    if (zona.includes('Rodilla')) {
      dolor = 'Rodilla';
      lado = zona.includes('izquierda') || zona.includes('Izquierda') ? 'Izquierda' : 'Derecha';
    } else if (zona.includes('Cadera')) {
      dolor = 'Cadera';
      lado = zona.includes('izquierda') || zona.includes('Izquierda') ? 'Izquierda' : 'Derecha';
    } else if (zona === 'Columna lumbar') {
      dolor = 'Columna lumbar';
      lado = '';
    }

    setDatosPaciente((prev) => ({
      ...prev,
      dolor,
      lado,
    }));

    setMostrarVistaPrevia(false);
  };

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMostrarVistaPrevia(true);
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await fetch('https://asistencia-ica-backend.onrender.com/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPaciente),
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
        <EsquemaHumanoSVG onSeleccionZona={onSeleccionZona} />
      </div>

      <div style={styles.formularioContainer}>
        <FormularioPaciente datos={datosPaciente} onCambiarDato={handleCambiarDato} onSubmit={handleSubmit} />

        {mostrarVistaPrevia && <PreviewOrden datos={datosPaciente} />}

        {mostrarVistaPrevia && (
          <button style={styles.downloadButton} onClick={handleDescargarPDF}>
            Descargar PDF
          </button>
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
