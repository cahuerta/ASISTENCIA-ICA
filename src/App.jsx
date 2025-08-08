import React, { useState, useEffect } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';

function generarIdPago() {
  return 'pago_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pago') === 'ok') {
      const idPago = sessionStorage.getItem('idPago');
      if (idPago) {
        setPagoRealizado(true);
        setMostrarPago(false);
        setMostrarVistaPrevia(true);
      } else {
        alert('No se encontró el ID del pago. No podrá descargar el PDF.');
      }
    } else if (params.get('pago') === 'cancelado') {
      alert('Pago cancelado.');
      setMostrarPago(false);
      setMostrarVistaPrevia(false);
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
    const idPago = sessionStorage.getItem('idPago');
    if (!idPago) {
      alert('ID de pago no encontrado');
      return;
    }

    try {
      const res = await fetch(`https://asistencia-ica-backend.onrender.com/pdf/${idPago}`);
      if (!res.ok) {
        throw new Error('Error al obtener el PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden_${datosPaciente.nombre.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('No se pudo descargar el PDF.');
      console.error(error);
    }
  };

  const handleIrAPagoKhipu = async () => {
    if (!datosPaciente.nombre || !datosPaciente.rut || !datosPaciente.edad || !datosPaciente.dolor) {
      alert('Complete todos los campos antes de pagar');
      return;
    }

    const idPago = generarIdPago();

    try {
      const res = await fetch('https://asistencia-ica-backend.onrender.com/guardar-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPago, datosPaciente }),
      });

      const json = await res.json();
      if (!json.ok) {
        alert('Error guardando datos antes del pago.');
        return;
      }

      sessionStorage.setItem('idPago', idPago);

      // Redirigir a la plataforma de pago sin modificar la URL
      window.location.href = 'https://khipu.com/payment/process/zZMWd';

    } catch (error) {
      alert('Error al iniciar el pago');
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

        {mostrarVistaPrevia && !pagoRealizado && !mostrarPago && (
          <button
            style={{ ...styles.downloadButton, backgroundColor: '#004B94', marginTop: '10px' }}
            onClick={() => setMostrarPago(true)}
          >
            Pagar ahora
          </button>
        )}

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
