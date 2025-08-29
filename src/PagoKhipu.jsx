// src/PagoKhipu.jsx
// Frontend: inicia pago llamando al backend y redirige a la URL que éste responda.

const BACKEND_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== 'undefined' && window.__ENV__?.BACKEND_BASE) ||
  'https://asistencia-ica-backend.onrender.com';

async function fetchJSON(url, options = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const raw = await r.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, data, raw };
  } finally {
    clearTimeout(t);
  }
}

export function generarIdPago(prefix = 'pago') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

export async function guardarDatos(idPago, datosPaciente, modulo = 'trauma') {
  const route =
    modulo === 'preop' ? '/guardar-datos-preop' :
    modulo === 'generales' ? '/guardar-datos-generales' :
    '/guardar-datos';
  const { ok, data } = await fetchJSON(`${BACKEND_BASE}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, datosPaciente }),
  });
  if (!ok || !data?.ok) throw new Error(data?.error || 'No se pudieron guardar los datos antes del pago');
  return true;
}

export async function crearPagoKhipu({ idPago, datosPaciente, modulo = 'trauma', modoGuest = false }) {
  const { ok, status, data, raw } = await fetchJSON(`${BACKEND_BASE}/crear-pago-khipu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, datosPaciente, modulo, modoGuest }),
  });
  if (!ok || !data?.ok || !data?.url) {
    const msg = data?.error || `Fallo HTTP ${status}`;
    throw new Error(`${msg}${data?.detail ? `\n${JSON.stringify(data.detail)}` : ''}`);
  }
  return data.url; // <- URL de Khipu (real) o retorno (guest)
}

export async function irAPagoKhipu(datosPaciente, opts = {}) {
  const edadNum = Number(datosPaciente?.edad);
  if (
    !datosPaciente?.nombre?.trim() ||
    !datosPaciente?.rut?.trim() ||
    !Number.isFinite(edadNum) || edadNum <= 0 ||
    !datosPaciente?.dolor?.trim()
  ) {
    alert('Complete todos los campos antes de pagar');
    return;
  }

  const modulo = (opts?.modulo || (typeof window !== 'undefined' && sessionStorage.getItem('modulo')) || 'trauma').toLowerCase();
  const idPago = opts?.idPago || generarIdPago(modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago');

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));
  }

  await guardarDatos(idPago, { ...datosPaciente, edad: edadNum }, modulo);
  const urlPago = await crearPagoKhipu({ idPago, datosPaciente: { ...datosPaciente, edad: edadNum }, modulo, modoGuest: false });
  window.location.href = urlPago;
}

// Compat: descarga PDF “trauma”
export async function descargarPDF(nombreArchivo = 'orden.pdf', idPagoParam) {
  const idPago = idPagoParam || (typeof window !== 'undefined' ? sessionStorage.getItem('idPago') : null);
  if (!idPago) { alert('ID de pago no encontrado'); return; }
  const r = await fetch(`${BACKEND_BASE}/pdf/${encodeURIComponent(idPago)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('Error al obtener el PDF');
  const blob = await r.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
