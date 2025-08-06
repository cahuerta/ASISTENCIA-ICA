import React, { useState, useEffect } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';

// Importar el componente botón MercadoPago que crearás
import MercadoPagoButton from './MercadoPagoButton';

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: '',
    rut: '',
    edad: '',
    dolor: '',
    lado: '',
  });

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  // Estado para controlar si pago confirmado
  const [pagoRealizado, setPagoRealizado] = useState(false);

  // Estado para mostrar botón oficial MercadoPago
  const [mostrarPago, setMostrarPago] = useState(false);

  // Detectar parámetro en URL para pago confirmado
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pago') === 'confirmado') {
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
    setPagoRealizado(false); // Reiniciar pago si se genera otro informe
    setMostrarPago(false);   // Ocultar botón oficial MercadoPago al iniciar
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

        {/* Al generar preview, solo mostrar botón Pagar ahora si no se ha pagado */}
        {mostrarVistaPrevia && !pagoRealizado && !mostrarPago && (
          <button
            style={{ ...styles.downloadButton, backgroundColor: '#004B94', marginTop: '10px' }}
            onClick={() => setMostrarPago(true)}
          >
            Pagar ahora
          </button>
        )}

        {/* Mostrar botón oficial MercadoPago solo cuando se haga click en “Pagar ahora” */}
        {mostrarVistaPrevia && !pagoRealizado && mostrarPago && (
          <MercadoPagoButton
            preferenceId="310942987-2e0cf851-eb60-4f5e-a894-04a57ed0273c"
            onPagoExitoso={() => setPagoRealizado(true)}
          />
        )}

        {/* Mostrar botón para descargar PDF solo después de pago confirmado */}
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
