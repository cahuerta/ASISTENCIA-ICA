"use client";
import React, { useState, useEffect, useRef } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';
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
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false); // compat
  const pollerRef = useRef(null);

  // Al montar: restaurar datos y manejar retorno ?pago=ok&idPago=...
  useEffect(() => {
    // Restaurar formulario si existe respaldo
    const saved = sessionStorage.getItem('datosPacienteJSON');
    if (saved) {
      try { setDatosPaciente(JSON.parse(saved)); } catch {}
    }

    const params = new URLSearchParams(window.location.search);
    const pago = params.get('pago');
    const idPagoURL = params.get('idPago');
    const idPagoSS = sessionStorage.getItem('idPago');
    const idFinal = idPagoURL || idPagoSS || '';

    // Limpia cualquier poller anterior
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (pago === 'ok' && idFinal) {
      sessionStorage.setItem('idPago', idFinal);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(false);
      setProcesandoPago(true);

      // 🔁 Polling al backend hasta que el webhook marque pagado:true
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          const r = await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`);
          const j = await r.json();
          if (j?.ok && j?.pagado) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
            setProcesandoPago(false);
            setPagoRealizado(true);
          }
        } catch {}
        if (intentos >= 30) { // ~60s
          clearInterval(pollerRef.current);
          pollerRef.current = null;
          setProcesandoPago(false);
        }
      }, 2000);
    } else if (pago === 'ok' && !idFinal) {
      // Volvió sin idPago y tampoco hay respaldo
      alert('No recibimos idPago en el retorno. Intenta nuevamente.');
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

  // Descarga con fallback si el backend perdió memoria (Render reinicio)
  const handleDescargarPDF = async () => {
    const idPago = sessionStorage.getItem('idPago');
    if (!idPago) {
      alert('ID de pago no encontrado');
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`);
      if (res.status === 404) return { ok: false, status: 404 };
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
      return { ok: true };
    };

    try {
      const r1 = await intentaDescarga();
      if (r1.ok) return;

      if (r1.status === 404) {
        const respaldo = sessionStorage.getItem('datosPacienteJSON');
        const datosReinyectar = respaldo ? JSON.parse(respaldo) : datosPaciente;

        // Reinyecta datos y reintenta (para cuando el pod se reinició)
        await fetch(`${BACKEND_BASE}/guardar-datos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPago, datosPaciente: datosReinyectar }),
        });

        const r2 = await intentaDescarga();
        if (r2.ok) return;

        alert('No se pudo descargar el PDF después de reintentar.');
      }
    } catch (error) {
      console.error(error);
      alert('No se pudo descargar el PDF.');
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
      // Genera y respalda idPago + datos ANTES de ir a Khipu
      const idPagoTmp = sessionStorage.getItem('idPago') ||
        ('pago_' + Date.now() + '_' + Math.floor(Math.random() * 10000));

      sessionStorage.setItem('idPago', idPagoTmp);
      sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));

      // Guarda también en backend (por si Render reinicia)
      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPago: idPagoTmp, datosPaciente: { ...datosPaciente, edad: edadNum } }),
      });

      // Redirige a Khipu (pasa idPago al backend)
      await irAPagoKhipu({ ...datosPaciente, edad: edadNum, idPago: idPagoTmp });
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
              onClick={async () => {
                // Modo prueba local
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
                sessionStorage.setItem('datosPacienteJSON', JSON.stringify(datosGuest));
                await fetch(`${BACKEND_BASE}/guardar-datos`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idPago, datosPaciente: datosGuest }),
                });
                setMostrarVistaPrevia(true);
                setPagoRealizado(true);
              }}
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
