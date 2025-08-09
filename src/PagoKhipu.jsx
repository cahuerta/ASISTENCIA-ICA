// src/PagoKhipu.jsx
// Frontend para iniciar pago Khipu contra backend en Render

// 1) Permite configurar por env en Vercel: Settings → Environment Variables
const BACKEND_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  'https://asistencia-ica-backend.onrender.com';

// --- util: fetch con timeout y manejo de JSON/Texto seguro ---
async function fetchJSON(url, options = {}, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    return { ok: r.ok, status: r.status, data, raw: text };
  } finally {
    clearTimeout(t);
  }
}

// Genera un id único de pago
export function generarIdPago() {
  return 'pago_' + Date.now() + '_' + Math.floor(Math.random() * 1_000_000);
}

// Guarda datos previos al pago en el backend
export async function guardarDatos(idPago, datosPaciente) {
  const { ok, data, raw } = await fetchJSON(`${BACKEND_BASE}/guardar-datos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, datosPaciente }),
  });
  if (!ok || !data?.ok) {
    throw new Error((data?.error) || 'No se pudieron guardar los datos antes del pago');
  }
  return true;
}

// Crea el pago en el backend (usa modoGuest para prueba o real para Khipu API)
export async function crearPagoKhipu({ idPago, datosPaciente, modoGuest = false }) {
  const { ok, status, data, raw } = await fetchJSON(`${BACKEND_BASE}/crear-pago-khipu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, modoGuest, datosPaciente }),
  });

  if (!ok || !data?.ok || !data?.url) {
    const msgBase = data?.error || `Fallo HTTP ${status}`;
    const detail = data?.detail || (raw && raw.startsWith('<') ? 'El backend respondió HTML (¿apuntando a Vercel por error?).' : '');
    throw new Error(`${msgBase}${detail ? `\n${detail}` : ''}`);
  }
  return data.url; // URL de Khipu (real) o retorno (guest)
}

// Flujo completo: guardar datos -> pedir URL de pago -> redirigir
export async function irAPagoKhipu(datosPaciente) {
  if (!datosPaciente?.nombre || !datosPaciente?.rut || !datosPaciente?.edad || !datosPaciente?.dolor) {
    alert('Complete todos los campos antes de pagar');
    return;
  }
  const idPago = generarIdPago();
  sessionStorage.setItem('idPago', idPago);

  try {
    await guardarDatos(idPago, datosPaciente);
    const urlPago = await crearPagoKhipu({ idPago, datosPaciente, modoGuest: false });
    window.location.href = urlPago; // abre Khipu
  } catch (err) {
    alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
  }
}

// Simular pago guest (redirige a ?pago=ok&idPago=...)
export async function simularPagoGuest(datosPaciente) {
  const d = datosPaciente || { nombre: 'Guest', rut: '99999999-9', edad: 30, dolor: 'Rodilla', lado: 'Izquierda' };
  const idPago = generarIdPago();
  sessionStorage.setItem('idPago', idPago);
  await guardarDatos(idPago, d);
  const urlGuest = await crearPagoKhipu({ idPago, datosPaciente: d, modoGuest: true });
  window.location.href = urlGuest;
}

// Lee retorno ?pago=ok|cancelado&idPago=...
export function leerRetornoPago() {
  const params = new URLSearchParams(window.location.search);
  const estado = params.get('pago');
  const idPagoURL = params.get('idPago');
  if (estado === 'ok' && idPagoURL) {
    sessionStorage.setItem('idPago', idPagoURL);
    return { pagoRealizado: true, idPago: idPagoURL, cancelado: false };
  }
  if (estado === 'cancelado') return { pagoRealizado: false, idPago: null, cancelado: true };
  return { pagoRealizado: false, idPago: null, cancelado: false };
}

// Descarga PDF por idPago
export async function descargarPDF(nombreArchivo = 'orden.pdf', idPagoParam) {
  const idPago = idPagoParam || sessionStorage.getItem('idPago');
  if (!idPago) {
    alert('ID de pago no encontrado');
    return;
  }
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
