"use client";
import React, { useState, useEffect } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';
// ❌ Antes: import PagoKhipu from './PagoKhipu.jsx';
// ✅ Ahora: importamos la función que realmente inicia el pago
import { irAPagoKhipu } from './PagoKhipu.jsx';

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
  const [mostrarPago, setMostrarPago] = useState(false); // lo dejamos para no romper lógica, pero ya no se usa para renderizar un componente

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get('pago');
    const idPagoURL = params.get('idPago');

    if (pago === 'ok' && idPagoURL) {
      sessionStorage.setItem('idPago', idPagoURL);
      setPagoRealizado(true);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
    } else if (pago === 'cancelado') {
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

  const handleSimularGuest = async () => {
    const idPago = 'guest_test_pago';

    const datosGuest = {
      nombre: 'Guest',
      rut: '99999999-9',
      edad: 30,
      dolor: 'Rodilla',
      lado: 'Izquierda',
    };

    setDatosPaciente(datosGuest);
    sessionStorage.setItem('idPago', idPago);

    try {
      await fetch('https://asistencia-ica-backend.onrender.com/guardar-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPago, datosPaciente: datosGuest }),
      });

      setPagoRealizado(true);
      setMostrarVistaPrevia(true);
    } catch (error) {
      console.error('Error en modo guest:', error);
      alert('Error al simular pago en modo guest.');
    }
  };

  // 🔹 Nuevo: handler mínimo para iniciar el flujo real de Khipu
  const handlePagarAhora = async () => {
    const edadNum = Number(datosPaciente.edad);
    if (
      !datosPaciente.nombre?.trim() ||
      !datosPaciente.rut?.trim() ||
      !Number.isFinite(edadNum) || edadNum <= 0 ||
      !datosPaciente.dolor?.trim()
    ) {
      alert('Complete nombre, RUT, edad (>0) y dolor antes de pagar.');
      return;
    }

    try {
      await irAPagoKhipu({ ...datosPaciente, edad: edadNum }); // esto redirige a Khipu
    } catch (err) {
      console.error('No se pudo generar el link de pago:', err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
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
          <>
            {/* 🔹 Antes abría un “modal” de PagoKhipu que no existe */}
            {/* 🔹 Ahora dispara el pago real directamente */}
            <button
              style={{ ...styles.downloadButton, backgroundColor: '#004B94', marginTop: '10px' }}
              onClick={handlePagarAhora}
            >
              Pagar ahora
            </button>
            <button
              style={{ ...styles.downloadButton, backgroundColor: '#777', marginTop: '10px' }}
              onClick={handleSimularGuest}
            >
              Simular Pago como Guest
            </button>
          </>
        )}

        {/* ❌ Quitamos este bloque porque <PagoKhipu /> no existe */}
        {/* {mostrarVistaPrevia && !pagoRealizado && mostrarPago && (
          <PagoKhipu
            datosPaciente={datosPaciente}
            setPagoRealizado={setPagoRealizado}
            setMostrarVistaPrevia={setMostrarVistaPrevia}
          />
        )} */}

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
