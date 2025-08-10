// src/PagoKhipu.jsx
// Frontend para iniciar pago Khipu contra backend en Render

// 1) Permite configurar por env en Vercel: Settings → Environment Variables
//    y opcionalmente inyección runtime vía window.__ENV__ en el HTML.
const BACKEND_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== 'undefined' && window.__ENV__?.BACKEND_BASE) ||
  'https://asistencia-ica-backend.onrender.com';

// --- util: fetch con timeout y manejo de JSON/Texto seguro ---
async function fetchJSON(url, options = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    const looksHtml = typeof text === 'string' && text.trim().startsWith('<');
    return { ok: r.ok, status: r.status, data, raw: text, looksHtml };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, status: 0, data: null, raw: 'Timeout', looksHtml: false, timeout: true };
    }
    throw e;
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
  const { ok, data } = await fetchJSON(`${BACKEND_BASE}/guardar-datos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, datosPaciente }),
  });
  if (!ok || !data?.ok) {
    throw new Error(data?.error || 'No se pudieron guardar los datos antes del pago');
  }
  return true;
}

// Permite forzar modo invitado vía env sin tocar llamadas existentes
const GUEST_DEFAULT =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_KHIPU_GUEST === '1') ||
  (typeof window !== 'undefined' && window.__ENV__?.KHIPU_GUEST === '1') ||
  false;

// Crea el pago en el backend (usa modoGuest para prueba o real para Khipu API)
export async function crearPagoKhipu({ idPago, datosPaciente, modoGuest = GUEST_DEFAULT }) {
  const { ok, status, data, raw, looksHtml, timeout } = await fetchJSON(`${BACKEND_BASE}/crear-pago-khipu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, modoGuest, datosPaciente }),
  });

  if (!ok || !data?.ok || !data?.url) {
    const msgBase = data?.error || (timeout ? 'Timeout al contactar backend' : `Fallo HTTP ${status || 0}`);
    const detail =
      data?.detail ||
      (looksHtml ? 'Respuesta HTML (revisar URL del backend o ruta /crear-pago-khipu).' : (raw || ''));
    throw new Error(`${msgBase}${detail ? `\n${detail}` : ''}`);
  }
  return data.url; // URL de Khipu (real) o retorno (guest)
}

/**
 * Flujo completo:
 *  - opcionalmente recibe un idPago (si no, lo genera acá)
 *  - guarda idPago + datos en sessionStorage (respaldo)
 *  - guarda datos en backend
 *  - solicita URL de pago y redirige
 */
export async function irAPagoKhipu(datosPaciente, opts = {}) {
  const edadNum = Number(datosPaciente?.edad);
  if (
    !datosPaciente?.nombre?.trim() ||
    !datosPaciente?.rut?.trim() ||
    !Number.isFinite(edadNum) ||
    edadNum <= 0 ||
    !datosPaciente?.dolor?.trim()
  ) {
    alert('Complete todos los campos antes de pagar');
    return;
  }

  const idPago = opts?.idPago || generarIdPago();

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));
  }

  try {
    await guardarDatos(idPago, { ...datosPaciente, edad: edadNum });
    const urlPago = await crearPagoKhipu({ idPago, datosPaciente: { ...datosPaciente, edad: edadNum }, modoGuest: GUEST_DEFAULT === true ? true : false });
    window.location.href = urlPago; // abre Khipu
  } catch (err) {
    alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
  }
}

// Simular pago guest (redirige a ?pago=ok&idPago=...)
export async function simularPagoGuest(datosPaciente) {
  const d = datosPaciente || { nombre: 'Guest', rut: '99999999-9', edad: 30, dolor: 'Rodilla', lado: 'Izquierda' };
  const idPago = generarIdPago();

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify(d));
  }

  await guardarDatos(idPago, d);
  const urlGuest = await crearPagoKhipu({ idPago, datosPaciente: d, modoGuest: true });
  window.location.href = urlGuest;
}

// Lee retorno ?pago=ok|cancelado&idPago=... (con fallback a sessionStorage)
export function leerRetornoPago() {
  const params = new URLSearchParams(window.location.search);
  const estado = params.get('pago');
  const idPagoURL = params.get('idPago');
  const idPagoSS = typeof window !== 'undefined' ? sessionStorage.getItem('idPago') : null;
  const idFinal = idPagoURL || idPagoSS || null;

  if (estado === 'ok' && idFinal) {
    if (typeof window !== 'undefined') sessionStorage.setItem('idPago', idFinal);
    return { pagoRealizado: true, idPago: idFinal, cancelado: false };
  }
  if (estado === 'cancelado') return { pagoRealizado: false, idPago: idFinal, cancelado: true };
  return { pagoRealizado: false, idPago: idFinal, cancelado: false };
}

// Descarga PDF por idPago
export async function descargarPDF(nombreArchivo = 'orden.pdf', idPagoParam) {
  const idPago =
    idPagoParam || (typeof window !== 'undefined' ? sessionStorage.getItem('idPago') : null);
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
