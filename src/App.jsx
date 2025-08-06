import React, { useState, useEffect } from 'react';
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
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);

  // Detectar parámetro en URL para pago confirmado (Khipu)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pago') === 'ok') {
      setPagoRealizado(true);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
    }
  }, []);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  };

  const onSeleccionZona = (zona) => {
    let dolor = '';
    let lado = '';

    if (zona.includes('Columna')) {
      dolor = 'Columna lumbar';
      lado = '';
    } else if (zona.includes('Cadera')) {
      dolor = 'Cadera';
      lado = zona.includes('izquierda') ? 'Izquierda' : 'Derecha';
    } else if (zona.includes('Rodilla')) {
      dolor = 'Rodilla';
      lado = zona.includes('izquierda') ? 'Izquierda' : 'Derecha';
    }

    setDatosPaciente((prev) => ({
      ...prev,
      dolor,
      lado,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!datosPaciente.nombre || !datosPaciente.rut || !datosPaciente.edad || !datosPaciente.dolor) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
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
      a.download = `orden_${datosPaciente.nombre.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('No se pudo generar el PDF.');
      console.error(error);
    }
  };

  const handleIrAPagoKhipu = () => {
    window.location.href = 'https://khipu.com/payment/process/ZGqF6';
  };

  return (
    <div style={styles.container}>
      <div style={styles.esquemaContainer}>
        <EsquemaHumanoSVG onSeleccionZona={onSeleccionZona} />
      </div>

      <div style={styles.formularioContainer}>
        <FormularioPaciente
          datos={datosPaciente}
          onCambiarDato={handleCambiarDato}
          onSubmit={handleSubmit}
        />

        {mostrarVistaPrevia && <PreviewOrden datos={datosPaciente} />}

        {mostrarVistaPrevia && !pagoRealizado && !mostrarPago && (
          <button
            style={{ ...styles.downloadButton, backgroundColor: '#004B94', marginTop: '10px' }}
            onClick={() => setMostrarPago(true)}
          >
            Pagar ahora
          </button>
        )}

        {/* Mostrar botón de Khipu al hacer clic en “Pagar ahora” */}
        {mostrarVistaPrevia && !pagoRealizado && mostrarPago && (
          <button
            style={{ ...styles.downloadButton, backgroundColor: '#28a745', marginTop: '10px' }}
            onClick={handleIrAPagoKhipu}
          >
            Ir a pagar con Khipu
          </button>
        )}

        {mostrarVistaPrevia && pagoRealizado && (
          <button style={styles.downloadButton} onClick={handleDescargarPDF}>
            Descargar Documento
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
    maxWidth: '320px',
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
