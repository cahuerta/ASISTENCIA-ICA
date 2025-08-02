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
    switch (zona) {
      case 'rodillaIzquierda':
        setDatosPaciente((prev) => ({ ...prev, dolor: 'Rodilla', lado: 'Izquierda' }));
        break;
      case 'rodillaDerecha':
        setDatosPaciente((prev) => ({ ...prev, dolor: 'Rodilla', lado: 'Derecha' }));
        break;
      case 'caderaIzquierda':
        setDatosPaciente((prev) => ({ ...prev, dolor: 'Cadera', lado: 'Izquierda' }));
        break;
      case 'caderaDerecha':
        setDatosPaciente((prev) => ({ ...prev, dolor: 'Cadera', lado: 'Derecha' }));
        break;
      case 'columnaLumbar':
        setDatosPaciente((prev) => ({ ...prev, dolor: 'Columna lumbar', lado: '' }));
        break;
      default:
        break;
    }
    setMostrarVistaPrevia(false);
  };

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Datos para generar PDF:', datosPaciente); // Log para ver datos en consola
    setMostrarVistaPrevia(true);
  };

  const handleDescargarPDF = async () => {
    console.log('Enviando datos al backend:', datosPaciente); // Log para confirmar datos enviados
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
