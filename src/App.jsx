"use client";
import React, { useState, useEffect, useRef } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';
import { irAPagoKhipu } from './PagoKhipu.jsx';
import PreopModulo from './modules/PreopModulo.jsx'; // 👈 módulo preoperatorio

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
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState('');
  const pollerRef = useRef(null);

  // ⬇️ módulo NO seleccionado al inicio; el usuario elige tras "Generar informe"
  const [modulo, setModulo] = useState(null); // null | 'trauma' | 'preop'

  // Al montar: restaurar datos y manejar retorno ?pago=ok|cancelado&idPago=...
  useEffect(() => {
    // Restaurar formulario si existe respaldo
    const saved = sessionStorage.getItem('datosPacienteJSON');
    if (saved) {
      try { setDatosPaciente(JSON.parse(saved)); } catch {}
    }
    // Restaurar módulo si existía
    const moduloSS = sessionStorage.getItem('modulo');
    if (moduloSS === 'trauma' || moduloSS === 'preop') {
      setModulo(moduloSS);
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

    // ✅ Mostrar descarga al volver de Khipu, respetando el módulo recordado
    if (pago === 'ok' && idFinal) {
      sessionStorage.setItem('idPago', idFinal);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);

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
      // ✅ Recarga sin query params pero hay idPago
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
    } else if (pago === 'ok' && !idFinal) {
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
    // Mostrar SOLO el menú de módulos; el preview depende de la elección
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
    setModulo(null); // el usuario decide
    sessionStorage.removeItem('modulo');
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Descarga (solo TRAUMA en este App; PREOP maneja su propio flujo en su módulo)
  const handleDescargarPDF = async () => {
    const idPago = sessionStorage.getItem('idPago');
    if (!idPago) {
      alert('ID de pago no encontrado');
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: 'no-store' });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
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

    setDescargando(true);
    setMensajeDescarga('Verificando pago…');

    let reinyectado = false;
    try {
      const maxIntentos = 30;
      for (let i = 1; i <= maxIntentos; i++) {
        const r = await intentaDescarga();
        if (r.ok) break;

        if (r.status === 402) {
          setMensajeDescarga(`Verificando pago… (${i}/${maxIntentos})`);
          await sleep(1500);
          if (i === maxIntentos) alert('El pago aún no se confirma. Intenta nuevamente en unos segundos.');
          continue;
        }

        if (r.status === 404) {
          if (!reinyectado) {
            setMensajeDescarga('Restaurando datos…');
            const respaldo = sessionStorage.getItem('datosPacienteJSON');
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datosPaciente;

            await fetch(`${BACKEND_BASE}/guardar-datos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idPago, datosPaciente: datosReinyectar }),
            });

            reinyectado = true;
            await sleep(500);
            continue;
          } else {
            alert('No se pudo descargar el PDF después de reintentar.');
            break;
          }
        }

        alert('No se pudo descargar el PDF.');
        break;
      }
    } catch (error) {
      console.error(error);
      alert('No se pudo descargar el PDF.');
    } finally {
      setDescargando(false);
      setMensajeDescarga('');
    }
  };

  // Pago (Trauma en App; PREOP paga dentro de su módulo)
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
      const idPagoTmp = sessionStorage.getItem('idPago') ||
        ('pago_' + Date.now() + '_' + Math.floor(Math.random() * 10000));

      sessionStorage.setItem('idPago', idPagoTmp);
      sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPago: idPagoTmp, datosPaciente: { ...datosPaciente, edad: edadNum } }),
      });

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

        {/* Menú de módulos después de ingresar datos (sin preview aún) */}
        {mostrarVistaPrevia && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
              <button
                style={{ ...styles.downloadButton, backgroundColor: modulo === 'trauma' ? '#004B94' : '#0072CE' }}
                onClick={() => { setModulo('trauma'); sessionStorage.setItem('modulo', 'trauma'); }}
              >
                Asistencia médica traumatológica
              </button>
              <button
                style={{ ...styles.downloadButton, backgroundColor: modulo === 'preop' ? '#004B94' : '#0072CE' }}
                onClick={() => { setModulo('preop'); sessionStorage.setItem('modulo', 'preop'); }}
              >
                Exámenes preoperatorios
              </button>
            </div>
          </div>
        )}

        {/* Controles de pago/descarga SOLO para TRAUMA (PREOP se maneja dentro de su módulo) */}
        {mostrarVistaPrevia && modulo === 'trauma' && (
          <>
            {!pagoRealizado && !mostrarPago && (
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
              <button
                style={styles.downloadButton}
                onClick={handleDescargarPDF}
                disabled={descargando}
                title={mensajeDescarga || 'Verificar y descargar'}
              >
                {descargando ? (mensajeDescarga || 'Verificando…') : 'Descargar Documento'}
              </button>
            )}
          </>
        )}
      </div>

      {/* ▶️ PREVIEW A LA DERECHA: depende de la opción elegida */}
      <div style={styles.previewContainer}>
        {mostrarVistaPrevia && modulo === 'trauma' && (
          <PreviewOrden datos={datosPaciente} />
        )}

        {mostrarVistaPrevia && modulo === 'preop' && (
          <PreopModulo initialDatos={datosPaciente} />
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
    flex: '0 0 320px',
    maxWidth: '320px',
  },
  formularioContainer: {
    flex: '0 0 400px',
    maxWidth: '400px',
  },
  previewContainer: {
    flex: 1,
    minWidth: '360px',
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
