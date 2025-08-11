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
  const [mostrarPago, setMostrarPago] = useState(false); // compat
  const pollerRef = useRef(null);

  // Al montar: restaurar datos y manejar retorno ?pago=ok|cancelado&idPago=...
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

    // ✅ Mostrar botón de descarga inmediatamente al volver de Khipu
    if (pago === 'ok' && idFinal) {
      sessionStorage.setItem('idPago', idFinal);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true); // 👈 ya muestra el botón

      // (Opcional) Polling en segundo plano (no bloquea la UI)
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try { await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`); } catch {}
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }, 2000);
    } else if (!pago && idFinal) {
      // ✅ Si se recargó la página sin query params pero ya hay idPago en sessionStorage
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
    } else if (pago === 'ok' && !idFinal) {
      // Volvió sin idPago y tampoco hay respaldo
      alert('No recibimos idPago en el retorno. Intenta nuevamente.');
    } else if (pago === 'cancelado') {
      alert('Pago cancelado.');
      setMostrarPago(false);
      setMostrarVistaPrevia(false);
      setPagoRealizado(false);
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

  // Descarga con fallback si el backend perdió memoria (Render reinicio) y bloqueo 402 “no pagado”
  const handleDescargarPDF = async () => {
    const idPago = sessionStorage.getItem('idPago');
    if (!idPago) {
      alert('ID de pago no encontrado');
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: 'no-store' });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 }; // pago no confirmado
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

      // ⛔️ No pagado: avisa y no reintenta hasta que se confirme
      if (r1.status === 402) {
        alert('Tu pago aún no está confirmado. Si finalizaste en el banco, espera unos segundos y vuelve a intentar.');
        return;
      }

      // 🔁 Backend reiniciado: reinyecta datos y vuelve a intentar
      if (r1.status === 404) {
        const respaldo = sessionStorage.getItem('datosPacienteJSON');
        const datosReinyectar = respaldo ? JSON.parse(respaldo) : datosPaciente;

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
            >
              Pagar ahora
            </button>
            <button
              style={{ ...styles.downloadButton, backgroundColor: '#777', marginTop: '10px' }}
              onClick={async () => {
                // Modo guest: guarda y redirige simulando retorno pagado
                const idPago = 'guest_test_pago';
                const datosGuest = {
                  nombre: 'Guest',
                  rut: '99999999-9',
                  edad: 30,
                  dolor: 'Rodilla',
                  lado: 'Izquierda',
                };
                sessionStorage.setItem('idPago', idPago);
                sessionStorage.setItem('datosPacienteJSON', JSON.stringify(datosGuest));

                // Marcamos guest como pagado en backend vía crear-pago-khipu modoGuest
                const resp = await fetch(`${BACKEND_BASE}/crear-pago-khipu`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idPago, modoGuest: true, datosPaciente: datosGuest }),
                });
                const j = await resp.json();
                if (j?.ok && j?.url) {
                  window.location.href = j.url; // ?pago=ok&idPago=guest_test_pago
                } else {
                  alert('Guest no disponible. Ver backend.');
                }
              }}
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
