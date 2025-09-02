"use client";
import React, { useState, useEffect, useRef } from 'react';
import EsquemaHumanoSVG from './EsquemaHumanoSVG.jsx';
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';
import { irAPagoKhipu } from './PagoKhipu.jsx';
import PreopModulo from './modules/PreopModulo.jsx';
import GeneralesModulo from './modules/GeneralesModulo.jsx';
import IAModulo from './modules/IAModulo.jsx'; // <-- NUEVO
import AvisoLegal from './components/AvisoLegal.jsx'; // <-- AVISO LEGAL

const BACKEND_BASE = 'https://asistencia-ica-backend.onrender.com';

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: '',
    rut: '',
    edad: '',
    genero: '',
    dolor: '',
    lado: '',
  });

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState('');
  const pollerRef = useRef(null);

  const [modulo, setModulo] = useState(null); // null | 'trauma' | 'preop' | 'generales' | 'ia'

  // ---- AVISO LEGAL ----
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
    setModulo(null);
    sessionStorage.removeItem('modulo');
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    try { window.close(); } catch {}
    setTimeout(() => {
      if (!window.closed) window.location.href = 'about:blank';
    }, 0);
  };
  // ----------------------

  useEffect(() => {
    const saved = sessionStorage.getItem('datosPacienteJSON');
    if (saved) {
      try { setDatosPaciente(JSON.parse(saved)); } catch {}
    }
    const moduloSS = sessionStorage.getItem('modulo');
    if (moduloSS === 'trauma' || moduloSS === 'preop' || moduloSS === 'generales' || moduloSS === 'ia') {
      setModulo(moduloSS);
    }

    const params = new URLSearchParams(window.location.search);
    const pago = params.get('pago');
    const idPagoURL = params.get('idPago');
    const idPagoSS = sessionStorage.getItem('idPago');
    const idFinal = idPagoURL || idPagoSS || '';

    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (pago === 'ok' && idFinal) {
      sessionStorage.setItem('idPago', idFinal);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);

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
    // Mostrar aviso legal como paso adicional
    setMostrarAviso(true);
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
          if (i === maxIntentos) {
            alert('El pago aún no se confirma. Intenta nuevamente en unos segundos.');
          }
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

      await irAPagoKhipu(
        { ...datosPaciente, edad: edadNum },
        { idPago: idPagoTmp, modulo: 'trauma' }
      );
    } catch (err) {
      console.error('No se pudo generar el link de pago:', err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  return (
    <div style={styles.container}>
      {/* Modal Aviso Legal */}
      <AvisoLegal
        visible={mostrarAviso}
        persist={false}
        onAccept={continuarTrasAviso}
        onReject={rechazarAviso}
      />

      <div style={styles.esquemaContainer}>
        <EsquemaHumanoSVG onSeleccionZona={onSeleccionZona} />
      </div>

      {/* Columna izquierda: formulario */}
      <div style={styles.formularioContainer}>
        <FormularioPaciente datos={datosPaciente} onCambiarDato={handleCambiarDato} onSubmit={handleSubmit} />
        {/* (SE ELIMINA el bloque de botones aquí para evitar superposición) */}
      </div>

      {/* Columna derecha: toolbar + previews y acciones */}
      <div style={styles.previewContainer} data-preview-col>
        {mostrarVistaPrevia && (
          <div style={styles.toolbarSticky}>
            <div style={styles.toolbarGrid}>
              <button
                type="button"
                style={{ ...styles.toolbarButton, backgroundColor: modulo === 'trauma' ? '#004B94' : '#0072CE' }}
                onClick={() => { setModulo('trauma'); sessionStorage.setItem('modulo', 'trauma'); }}
              >
                ASISTENTE TRAUMATOLÓGICO
              </button>
              <button
                type="button"
                style={{ ...styles.toolbarButton, backgroundColor: modulo === 'preop' ? '#004B94' : '#0072CE' }}
                onClick={() => { setModulo('preop'); sessionStorage.setItem('modulo', 'preop'); }}
              >
                EXÁMENES PREQUIRÚRGICOS
              </button>
              <button
                type="button"
                style={{ ...styles.toolbarButton, backgroundColor: modulo === 'generales' ? '#004B94' : '#0072CE' }}
                onClick={() => { setModulo('generales'); sessionStorage.setItem('modulo', 'generales'); }}
              >
                REVISIÓN GENERAL
              </button>
              <button
                type="button"
                style={{ ...styles.toolbarButton, backgroundColor: modulo === 'ia' ? '#004B94' : '#0072CE' }}
                onClick={() => {
                  setModulo('ia');
                  sessionStorage.setItem('modulo', 'ia');
                  try {
                    document.querySelector('[data-preview-col]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } catch {}
                }}
              >
                ANÁLISIS MEDIANTE IA
              </button>
            </div>
          </div>
        )}

        {mostrarVistaPrevia && modulo === 'trauma' && (
          <>
            <PreviewOrden datos={datosPaciente} />

            {/* Botones de pago/descarga del módulo traumatológico: DEBAJO del preview */}
            {!pagoRealizado && !mostrarPago && (
              <>
                <button
                  type="button"
                  style={{ ...styles.downloadButton, backgroundColor: '#004B94', marginTop: '10px' }}
                  onClick={handlePagarAhora}
                >
                  Pagar ahora
                </button>
                <button
                  type="button"
                  style={{ ...styles.downloadButton, backgroundColor: '#777', marginTop: '10px' }}
                  onClick={async () => {
                    const idPago = 'guest_test_pago';
                    const datosGuest = {
                      nombre: 'Guest',
                      rut: '99999999-9',
                      edad: 30,
                      genero: 'Hombre',
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
                      window.location.href = j.url;
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
                type="button"
                style={{ ...styles.downloadButton, marginTop: '10px' }}
                onClick={handleDescargarPDF}
                disabled={descargando}
                title={mensajeDescarga || 'Verificar y descargar'}
              >
                {descargando ? (mensajeDescarga || 'Verificando…') : 'Descargar Documento'}
              </button>
            )}
          </>
        )}

        {mostrarVistaPrevia && modulo === 'preop' && (
          <PreopModulo initialDatos={datosPaciente} />
        )}

        {mostrarVistaPrevia && modulo === 'generales' && (
          <GeneralesModulo initialDatos={datosPaciente} />
        )}

        {mostrarVistaPrevia && modulo === 'ia' && (
          <IAModulo key={`ia-${modulo}`} initialDatos={datosPaciente} />
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
    position: 'relative',
    zIndex: 2,
  },
  previewContainer: {
    flex: 1,
    minWidth: '360px',
    position: 'relative',
    zIndex: 1,
  },

  /* ===== Toolbar (botones de módulo) ahora en la columna derecha ===== */
  toolbarSticky: {
    position: 'sticky',
    top: 0,
    background: '#f0f4f8',
    paddingTop: 4,
    paddingBottom: 8,
    zIndex: 5,
    borderBottom: '1px solid #dcdcdc',
  },
  toolbarGrid: {
    display: 'grid',
    gap: '8px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    alignItems: 'stretch',
  },
  toolbarButton: {
    backgroundColor: '#0072CE',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    whiteSpace: 'normal',
    lineHeight: 1.2,
    minHeight: 44,
  },

  /* ===== Botones de pago/descarga ===== */
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
