// src/PagoKhipu.jsx
// Frontend → orquesta pago pidiendo URL al backend (no toca Khipu directo)

// Lee BACKEND_BASE de env o usa tu Render
const BACKEND_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== 'undefined' && (window.__ENV__?.backend_base || window.__ENV__?.BACKEND_BASE)) ||
  'https://asistencia-ica-backend.onrender.com';

// --- util: fetch con timeout y manejo seguro ---
async function fetchJSON(url, options = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }
    const looksHtml = typeof text === 'string' && text.trim().startsWith('<');
    return { ok: r.ok, status: r.status, data, raw: text, looksHtml };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, status: 0, data: null, raw: 'Timeout', looksHtml: false, timeout: true };
    }
    throw e;
  } finally { clearTimeout(t); }
}

// Genera un id único (prefijo según módulo)
export function generarIdPago(prefix = 'pago') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

// Guarda datos previos al pago en el backend (por módulo)
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

// Pide al backend la URL real de Khipu (o guest si se indica)
export async function crearPagoKhipu({ idPago, datosPaciente, modulo = 'trauma', modoGuest = false }) {
  const { ok, status, data, raw, looksHtml, timeout } = await fetchJSON(`${BACKEND_BASE}/crear-pago-khipu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, modoGuest, datosPaciente, modulo }),
  });

  if (!ok || !data?.ok || !data?.url) {
    const base = data?.error || (timeout ? 'Timeout al contactar backend' : `Fallo HTTP ${status || 0}`);
    const detail = data?.detail || (looksHtml ? 'Respuesta HTML del backend.' : (raw || ''));
    throw new Error(`${base}${detail ? `\n${detail}` : ''}`);
  }
  return data.url; // URL de Khipu (real) o retorno guest
}

/**
 * Flujo completo:
 *  - valida campos
 *  - determina módulo ('trauma' | 'preop' | 'generales')
 *  - genera idPago (con prefijo según módulo)
 *  - guarda respaldo en sessionStorage
 *  - POST guardar-datos (módulo)
 *  - POST crear-pago-khipu (módulo) → redirige a Khipu
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

  const moduloOpt = (opts?.modulo || (typeof window !== 'undefined' ? sessionStorage.getItem('modulo') : '') || '').toLowerCase();
  const modulo = ['trauma', 'preop', 'generales'].includes(moduloOpt) ? moduloOpt : 'trauma';

  const idPago = opts?.idPago || generarIdPago(
    modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago'
  );

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));
  }

  try {
    await guardarDatos(idPago, { ...datosPaciente, edad: edadNum }, modulo);
    const urlPago = await crearPagoKhipu({
      idPago,
      datosPaciente: { ...datosPaciente, edad: edadNum },
      modulo,
      modoGuest: opts?.modoGuest === true ? true : false, // respeta tu elección
    });
    window.location.href = urlPago;
  } catch (err) {
    alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
  }
}

// (Opcional) Simular pago guest
export async function simularPagoGuest(datosPaciente, modulo = 'trauma') {
  const idPago = generarIdPago(modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago');
  const d = datosPaciente || { nombre: 'Guest', rut: '99999999-9', edad: 30, dolor: 'Rodilla', lado: 'Izquierda' };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify(d));
  }

  await guardarDatos(idPago, d, modulo);
  const url = await crearPagoKhipu({ idPago, datosPaciente: d, modulo, modoGuest: true });
  window.location.href = url;
}

// Lee retorno ?pago=ok|cancelado&idPago=...
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

// Descarga por módulo (útil si tienes un solo botón de descarga)
export async function descargarPDFPorModulo(modulo = 'trauma', nombreBase = 'documento') {
  const idPago = typeof window !== 'undefined' ? sessionStorage.getItem('idPago') : null;
  if (!idPago) {
    alert('ID de pago no encontrado');
    return;
  }
  const route =
    modulo === 'preop' ? `/pdf-preop/${encodeURIComponent(idPago)}` :
    modulo === 'generales' ? `/pdf-generales/${encodeURIComponent(idPago)}` :
    `/pdf/${encodeURIComponent(idPago)}`;

  const r = await fetch(`${BACKEND_BASE}${route}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('Error al obtener el PDF');
  const blob = await r.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreBase}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Compat: descarga trauma "clásica"
export async function descargarPDF(nombreArchivo = 'orden.pdf', idPagoParam) {
  const idPago = idPagoParam || (typeof window !== 'undefined' ? sessionStorage.getItem('idPago') : null);
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
