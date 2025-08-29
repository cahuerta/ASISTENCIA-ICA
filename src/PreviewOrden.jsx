import React, { useEffect, useState } from 'react';

// Mismo esquema que usas en otros módulos para resolver la base del backend
const BACKEND_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== 'undefined' && window.__ENV__?.BACKEND_BASE) ||
  'https://asistencia-ica-backend.onrender.com';

function PreviewOrden({ datos }) {
  const { nombre = '', rut = '', edad = '', dolor = '', lado = '' } = datos || {};

  const [examLines, setExamLines] = useState([]); // ← arreglo de líneas de examen
  const [nota, setNota] = useState('');           // ← nota con especialista según región
  const [loading, setLoading] = useState(false);

  // Consulta al backend para que el preview use EXACTAMENTE la misma lógica del PDF
  useEffect(() => {
    if (!dolor || !edad) {
      setExamLines([]);
      setNota('');
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        const url = `${BACKEND_BASE}/sugerir-imagenologia?dolor=${encodeURIComponent(
          dolor
        )}&lado=${encodeURIComponent(lado || '')}&edad=${encodeURIComponent(edad)}`;
        const r = await fetch(url, { cache: 'no-store', signal: controller.signal });
        const j = await r.json();
        if (j?.ok) {
          // examLines viene como arreglo ya separado (sin paréntesis del lado, y con teleradiografía en línea aparte)
          setExamLines(Array.isArray(j.examLines) ? j.examLines : (j.examen ? String(j.examen).split('\n') : []));
          setNota(j.nota || '');
        } else {
          setExamLines([]);
          setNota('');
        }
      } catch {
        setExamLines([]);
        setNota('');
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [dolor, lado, edad]);

  return (
    <div style={styles.container}>
      <div style={styles.logo}>
        <h2 style={{ color: '#0072CE', margin: 0 }}>Instituto de Cirugía Articular</h2>
      </div>

      <h3 style={styles.title}>Orden Médica de Examen Imagenológico</h3>

      <div style={styles.info}>
        <p><strong>Nombre:</strong> {nombre || '—'}</p>
        <p><strong>RUT:</strong> {rut || '—'}</p>
        <p><strong>Edad:</strong> {edad ? `${edad} años` : '—'}</p>
        <p><strong>Motivo / Diagnóstico:</strong> Dolor de {dolor || '—'} {lado || ''}</p>
      </div>

      <div style={styles.orden}>
        <strong>Orden médica solicitada:</strong>
        {loading ? (
          <p style={{ marginTop: 6 }}>Cargando…</p>
        ) : examLines.length > 0 ? (
          <ul style={styles.ul}>
            {examLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        ) : (
          <p style={{ marginTop: 6 }}>—</p>
        )}
      </div>

      {nota ? (
        <div style={styles.nota}>
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{nota}</p>
        </div>
      ) : null}

      <div style={styles.firma}>
        <hr style={{ width: '60%', margin: '20px auto' }} />
        <p style={{ textAlign: 'center', margin: 0 }}>Firma médico tratante</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    border: '1.5px solid #0072CE',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f9fbff',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#002663',
  },
  logo: {
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    color: '#004a99',
    marginBottom: 20,
    fontWeight: '700',
  },
  info: {
    fontSize: 16,
    lineHeight: 1.5,
    marginBottom: 20,
  },
  orden: {
    fontSize: 16,
    backgroundColor: '#d9e6ff',
    padding: 15,
    borderRadius: 8,
  },
  ul: {
    marginTop: 6,
    marginBottom: 0,
    paddingLeft: 20,
  },
  nota: {
    marginTop: 12,
    fontSize: 14,
    background: '#eef4ff',
    padding: 12,
    borderRadius: 8,
    whiteSpace: 'pre-line',
  },
  firma: {
    marginTop: 30,
  },
};

export default PreviewOrden;
