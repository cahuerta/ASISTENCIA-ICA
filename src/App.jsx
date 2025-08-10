"use client";
import React, { useState, useEffect, useRef } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';
// ✅ usamos la función que inicia el pago real
import { irAPagoKhipu } from './PagoKhipu.jsx';

const BACKEND_BASE = 'https://asistencia-ica-backend.onrender.com';

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
  const [procesandoPago, setProcesandoPago] = useState(false); // 👈 para mostrar “Procesando…”
  const [mostrarPago, setMostrarPago] = useState(false); // mantenido por compatibilidad
  const pollerRef = useRef(null);

  // Al volver desde Khipu: ?pago=ok&idPago=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get('pago');
    const idPagoURL = params.get('idPago');

    // Limpia cualquier poller anterior
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (pago === 'ok' && idPagoURL) {
      sessionStorage.setItem('idPago', idPagoURL);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(false);
      setProcesandoPago(true);

      // 🔁 Polling corto al backend hasta que el webhook marque pagado:true
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          const r = await fetch(`${BACKEND_BASE}/obtener-datos/${idPagoURL}`);
          const j = await r.json();
          if (j?.ok && j?.pagado) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
            setProcesandoPago(false);
            setPagoRealizado(true);
          }
        } catch (_e) {
          // silencioso
        }
        // corta a los ~60s (30 * 2s)
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
          setProcesandoPago(false);
          // Si no llegó el webhook aún, igual dejamos visible la vista previa.
          // El botón de descarga no se muestra hasta que pagado sea true.
        }
      }, 2000);
    } else if (pago === 'cancelado') {
      alert('Pago cancelado.');
      setMostrarPago(false);
      setMostrarVistaPrevia(false);
      setPagoRealizado(false);
      setProcesandoPago(false);
    }

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
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

    setDatosPaciente((prev) => ({ ...prev, dolor, lado }));
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
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`);
      if (!res.ok) throw new Error('Error al obtener el PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden_${(datosPaciente.nombre || 'paciente').replace(/ /g, '_')}.pdf`;
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
      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPago, datosPaciente: datosGuest }),
      });
      // En modo guest no hay webhook; puedes forzar el flag en backend si quieres.
      setMostrarVistaPrevia(true);
      setPagoRealizado(true); // permite probar descarga manual
    } catch (error) {
      console.error('Error en modo guest:', error);
      alert('Error al simular pago en modo guest.');
    }
  };

  // Inicia pago real de Khipu
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
      await irAPagoKhipu({ ...datosPaciente, edad: edadNum }); // redirige a Khipu
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
            <button
              style={{ ...styles.downloadButton, backgroundColor: '#004B94', marginTop: '10px' }}
              onClick={handlePagarAhora}
              disabled={procesandoPago}
            >
              {procesandoPago ? 'Procesando confirmación de pago…' : 'Pagar ahora'}
            </button>
            <button
              style={{ ...styles.downloadButton, backgroundColor: '#777', marginTop: '10px' }}
              onClick={handleSimularGuest}
              disabled={procesandoPago}
            >
              Simular Pago como Guest
            </button>
          </>
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
