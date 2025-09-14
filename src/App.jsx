"use client";
import React, { useState, useEffect, useRef } from 'react';
/* ESQUEMA */
import EsquemaAnterior from './EsquemaAnterior.jsx';
import EsquemaPosterior from './EsquemaPosterior.jsx';
import EsquemaToggleTabs from './EsquemaToggleTabs.jsx';

/* MÓDULOS Y COMPONENTES */
import FormularioPaciente from './FormularioPaciente.jsx';
import PreviewOrden from './PreviewOrden.jsx';
import { irAPagoKhipu } from './PagoKhipu.jsx';
import PreopModulo from './modules/PreopModulo.jsx';
import GeneralesModulo from './modules/GeneralesModulo.jsx';
import IAModulo from './modules/IAModulo.jsx';
import AvisoLegal from './components/AvisoLegal.jsx';
import FormularioResonancia from './components/FormularioResonancia.jsx';
import FormularioComorbilidades from './components/FormularioComorbilidades.jsx';

/* THEME (JSON) */
import theme from './theme.json';

const BACKEND_BASE = 'https://asistencia-ica-backend.onrender.com';

/* Mapea con fallback por si falta alguna clave en el JSON */
const T = {
  primary: theme?.primary || '#0072CE',
  primaryHover: theme?.primaryHover || '#0B64B3',
  accent: theme?.accent || '#00B3B8',
  bg: theme?.bg || '#f0f4f8',
  surface: theme?.surface || '#ffffff',
  textPrimary: theme?.textPrimary || '#0A0A0A',
  textMuted: theme?.textMuted || '#667085',
  border: theme?.border || '#E5E7EB'
};

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
  const [vista, setVista] = useState('anterior'); // 'anterior' | 'posterior'

  // ==== Modal RNM ====
  const [showReso, setShowReso] = useState(false);
  const [resolverReso, setResolverReso] = useState(null);
  const RED_FLAGS = new Set(["marcapasos","coclear_o_neuro","clips_aneurisma","valvula_cardiaca_metal","fragmentos_metalicos"]);
  const pedirChecklistResonancia = () =>
    new Promise((resolve)=>{ setResolverReso(()=>resolve); setShowReso(true); });
  const hasRedFlags = (data) =>
    Object.entries(data || {}).some(([k,v]) => RED_FLAGS.has(k) && v === true);
  const resumenResoTexto = (data) => {
    const si = Object.entries(data || {}).filter(([_,v])=>v===true).map(([k])=>k).join(', ') || '—';
    const no = Object.entries(data || {}).filter(([_,v])=>v===false).map(([k])=>k).join(', ') || '—';
    return [
      'FORMULARIO DE SEGURIDAD PARA RESONANCIA MAGNÉTICA',
      `Sí: ${si}`,
      `No: ${no}`,
      'Declaro que la información es veraz y autorizo la realización del examen.',
      'Firma Paciente: ______________________     RUT: _______________     Fecha: ____/____/______',
    ].join('\n');
  };

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
    setTimeout(() => { if (!window.closed) window.location.href = 'about:blank'; }, 0);
  };

  // ---- Comorbilidades (mismo overlay que RNM) ----
  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);
  const [comorbilidades, setComorbilidades] = useState(null);
  const handleSaveComorbilidades = (payload) => {
    setComorbilidades(payload);
    setMostrarVistaPrevia(true);
    setModulo('preop');
    setMostrarComorbilidades(false);
  };

  // ====== Montaje / Restauración ======
  useEffect(() => {
    // Aplica color de fondo del theme al body
    try { document.body.style.background = T.bg; } catch {}

    try {
      const saved = sessionStorage.getItem('datosPacienteJSON');
      if (saved) setDatosPaciente(JSON.parse(saved));
    } catch {}

    const moduloSS = sessionStorage.getItem('modulo');
    if (['trauma','preop','generales','ia'].includes(moduloSS)) {
      setModulo(moduloSS);
    }

    const vistaSS = sessionStorage.getItem('vistaEsquema');
    if (vistaSS === 'anterior' || vistaSS === 'posterior') setVista(vistaSS);

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

  // Persistir vista
  useEffect(() => {
    try { sessionStorage.setItem('vistaEsquema', vista); } catch {}
  }, [vista]);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => {
      const next = { ...prev, [campo]: valor };
      try { sessionStorage.setItem('datosPacienteJSON', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Selección en esquema
  const onSeleccionZona = (zona) => {
    let dolor = '';
    let lado = '';
    if (zona.includes('Columna')) { dolor = 'Columna lumbar'; lado = ''; }
    else if (zona.includes('Cadera')) { dolor = 'Cadera'; lado = zona.includes('izquierda') ? 'Izquierda' : 'Derecha'; }
    else if (zona.includes('Rodilla')) { dolor = 'Rodilla'; lado = zona.includes('izquierda') ? 'Izquierda' : 'Derecha'; }

    setDatosPaciente((prev) => {
      const next = { ...prev, dolor, lado };
      try { sessionStorage.setItem('datosPacienteJSON', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!datosPaciente.nombre || !datosPaciente.rut || !datosPaciente.edad || !datosPaciente.dolor) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }
    setMostrarAviso(true);
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ========= Detección RM (para RNM modal) =========
  const esResonanciaTexto = (t = "") => {
    const s = (t || "").toLowerCase();
    return s.includes("resonancia") || s.includes("resonancia magn") || /\brm\b/i.test(t);
  };

  const detectarResonanciaEnBackend = async (datos) => {
    try {
      const r = await fetch(`${BACKEND_BASE}/detectar-resonancia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datosPaciente: datos })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const flag = typeof j?.resonancia === 'boolean'
        ? j.resonancia
        : esResonanciaTexto(j?.texto || j?.orden || "");
      sessionStorage.setItem('solicitaResonancia', flag ? '1' : '0');
      return !!flag;
    } catch (e) {
      console.warn('No se pudo detectar RM en backend:', e);
      sessionStorage.setItem('solicitaResonancia', '0');
      return false;
    }
  };

  // ========= Descargar PDF (Trauma) =========
  const handleDescargarPDF = async () => {
    const idPago = sessionStorage.getItem('idPago');
    if (!idPago) return alert('ID de pago no encontrado');

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

  // ========= Pago (Trauma) =========
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

      // ¿Incluye RM?
      let extras = {};
      const solicitarRM = await detectarResonanciaEnBackend({ ...datosPaciente, edad: edadNum });

      if (solicitarRM) {
        const res = await pedirChecklistResonancia();
        if (res?.canceled) return;

        if (res.bloquea) {
          alert('Por seguridad, cambiaremos la resonancia por otro examen.');
          extras.ordenAlternativa = 'Sugerencia: TAC según protocolo (RM bloqueada por checklist de seguridad).';
        } else {
          extras.resonanciaChecklist = res.data || {};
          extras.resonanciaResumenTexto = res.resumen || resumenResoTexto(res.data || {});
        }
      }

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPago: idPagoTmp, datosPaciente: { ...datosPaciente, edad: edadNum }, ...extras }),
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

  // ===== Estilos dinámicos de botón (resalte del activo) =====
  const btnStyle = (active) => ({
    ...styles.toolbarButton,
    backgroundColor: active ? T.primary : T.primaryHover,
    border: active ? `2px solid ${T.accent}` : "1px solid transparent",
    color: '#fff',
    boxShadow: active ? `0 0 0 3px ${T.accent}33` : "none",
    transform: active ? "translateY(-1px)" : "none",
    transition: "all .15s ease",
    position: "relative",
  });

  const underlineStyle = {
    height: 4,
    borderRadius: 999,
    background: T.accent,
    marginTop: 6,
    opacity: 1,
  };

  return (
    <div style={{ ...styles.appRoot, background: T.bg }}>
      {/* Modal Aviso Legal */}
      <AvisoLegal
        visible={mostrarAviso}
        persist={false}
        onAccept={continuarTrasAviso}
        onReject={rechazarAviso}
      />

      {/* ===== BARRA SUPERIOR FIJA (usa theme.json) ===== */}
      {mostrarVistaPrevia && (
        <div style={{ ...styles.topBar, background: T.surface, borderBottom: `2px solid ${T.accent}` }}>
          <div style={styles.topBarGrid} role="tablist" aria-label="Módulos">
            <button
              type="button"
              style={btnStyle(modulo === 'trauma')}
              aria-current={modulo === 'trauma' ? 'page' : undefined}
              onClick={() => { setModulo('trauma'); sessionStorage.setItem('modulo', 'trauma'); }}
            >
              ASISTENTE TRAUMATOLÓGICO
              {modulo === 'trauma' && <div style={underlineStyle} />}
            </button>

            <button
              type="button"
              style={btnStyle(modulo === 'preop')}
              aria-current={modulo === 'preop' ? 'page' : undefined}
              onClick={() => {
                setModulo('preop');
                sessionStorage.setItem('modulo', 'preop');
                try { document.querySelector('[data-preview-col]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
              }}
            >
              EXÁMENES PREQUIRÚRGICOS
              {modulo === 'preop' && <div style={underlineStyle} />}
            </button>

            <button
              type="button"
              style={btnStyle(modulo === 'generales')}
              aria-current={modulo === 'generales' ? 'page' : undefined}
              onClick={() => { setModulo('generales'); sessionStorage.setItem('modulo', 'generales'); }}
            >
              REVISIÓN GENERAL
              {modulo === 'generales' && <div style={underlineStyle} />}
            </button>

            <button
              type="button"
              style={btnStyle(modulo === 'ia')}
              aria-current={modulo === 'ia' ? 'page' : undefined}
              onClick={() => {
                setModulo('ia');
                sessionStorage.setItem('modulo', 'ia');
                try { document.querySelector('[data-preview-col]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
              }}
            >
              ANÁLISIS MEDIANTE IA
              {modulo === 'ia' && <div style={underlineStyle} />}
            </button>
          </div>
        </div>
      )}

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <div style={styles.container}>
        {/* Columna: esquema */}
        <div style={styles.esquemaContainer}>
          <EsquemaToggleTabs vista={vista} onChange={setVista} />
          {vista === 'anterior'
            ? <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
            : <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />}
          <div
            aria-live="polite"
            role="status"
            style={{
              marginTop: 8, fontSize: 14, color: T.textPrimary, background: '#F3F4F6',
              padding: '6px 8px', borderRadius: 8, border: `1px solid ${T.border}`, minHeight: 30,
            }}
          >
            {datosPaciente?.dolor
              ? <>Zona seleccionada: <strong>{datosPaciente.dolor}{datosPaciente.lado ? ` — ${datosPaciente.lado}` : ''}</strong></>
              : 'Seleccione una zona en el esquema'}
          </div>
        </div>

        {/* Columna: formulario paciente */}
        <div style={styles.formularioContainer}>
          <FormularioPaciente datos={datosPaciente} onCambiarDato={handleCambiarDato} onSubmit={handleSubmit} />
        </div>

        {/* Columna: preview / acciones */}
        <div style={styles.previewContainer} data-preview-col>
          {mostrarVistaPrevia && modulo === 'trauma' && (
            <>
              <PreviewOrden datos={datosPaciente} />

              {!pagoRealizado && !mostrarPago && (
                <>
                  <button
                    type="button"
                    style={{ ...styles.downloadButton, backgroundColor: T.primary }}
                    onClick={handlePagarAhora}
                  >
                    Pagar ahora
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.downloadButton, backgroundColor: '#777' }}
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
                  style={{ ...styles.downloadButton, backgroundColor: T.primary }}
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
            <>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button
                  type="button"
                  onClick={() => setMostrarComorbilidades(true)}
                  style={{ ...styles.toolbarButton, maxWidth: 260, backgroundColor: T.primary }}
                >
                  COMORBILIDADES
                </button>
              </div>
              <PreopModulo initialDatos={datosPaciente} />
            </>
          )}

          {mostrarVistaPrevia && modulo === 'generales' && (
            <>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button
                  type="button"
                  onClick={() => setMostrarComorbilidades(true)}
                  style={{ ...styles.toolbarButton, maxWidth: 260, backgroundColor: T.primary }}
                >
                  COMORBILIDADES
                </button>
              </div>
              <GeneralesModulo initialDatos={datosPaciente} />
            </>
          )}

          {mostrarVistaPrevia && modulo === 'ia' && (
            <IAModulo key={`ia-${modulo}`} initialDatos={datosPaciente} />
          )}
        </div>
      </div>

      {/* ===== Modal RNM ===== */}
      {showReso && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <FormularioResonancia
              onCancel={() => { setShowReso(false); resolverReso?.({ canceled:true }); }}
              onSave={(data, { riesgos }) => {
                setShowReso(false);
                const resumen = resumenResoTexto(data);
                const bloquea = hasRedFlags(data);
                resolverReso?.({ canceled:false, bloquea, data, riesgos, resumen });
              }}
            />
          </div>
        </div>
      )}

      {/* ===== Modal Comorbilidades ===== */}
      {mostrarComorbilidades && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <FormularioComorbilidades
              initial={comorbilidades || {}}
              onSave={handleSaveComorbilidades}
              onCancel={() => setMostrarComorbilidades(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appRoot: {
    minHeight: '100vh',
  },
  container: {
    display: 'grid',
    gridTemplateColumns: '400px 400px 1fr',
    gap: '40px',
    padding: '20px',
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding: '10px 16px',
  },
  topBarGrid: {
    display: 'grid',
    gap: '8px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    alignItems: 'stretch',
    maxWidth: 1400,
    margin: '0 auto',
  },
  esquemaContainer: {
    flex: '0 0 400px',
    maxWidth: '400px',
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
  toolbarButton: {
    backgroundColor: '#0072CE',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    whiteSpace: 'normal',
    lineHeight: 1.2,
    minHeight: 48,
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
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
    display:'grid', placeItems:'center', zIndex:9999
  },
  overlayCard: {
    width:'min(900px, 96vw)'
  }
};

export default App;
