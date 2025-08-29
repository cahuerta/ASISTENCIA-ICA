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

// Genera un id único de pago (puedes prefijar: 'preop_', 'generales_' para claridad)
export function generarIdPago(prefix = 'pago') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

// === NUEVO: guardar datos por MÓDULO ===
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

// === NUEVO: enviar `modulo` al backend ===
export async function crearPagoKhipu({ idPago, datosPaciente, modulo = 'trauma', modoGuest = GUEST_DEFAULT }) {
  const { ok, status, data, raw, looksHtml, timeout } = await fetchJSON(`${BACKEND_BASE}/crear-pago-khipu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, modoGuest, datosPaciente, modulo }),
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
 * Flujo completo (ahora con módulo):
 *  - recibe opcionalmente un idPago y modulo: 'trauma' | 'preop' | 'generales'
 *  - guarda idPago + datos + modulo en sessionStorage (respaldo)
 *  - guarda datos en backend (endpoint según módulo)
 *  - solicita URL de pago (manda modulo) y redirige
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

  // Detecta módulo por prioridad: opts.modulo → sessionStorage → prefijo de id → trauma
  const moduloSS = (typeof window !== 'undefined' && sessionStorage.getItem('modulo')) || null;
  const moduloOpt = (opts?.modulo || moduloSS || '').toLowerCase();
  let modulo = ['trauma', 'preop', 'generales'].includes(moduloOpt) ? moduloOpt : 'trauma';

  // id y prefijo (si ya te llega preop_ o generales_, se respeta)
  const idPago = opts?.idPago || generarIdPago(
    modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago'
  );

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));
  }

  try {
    // Guarda según módulo
    await guardarDatos(idPago, { ...datosPaciente, edad: edadNum }, modulo);

    // Crea pago indicando módulo
    const urlPago = await crearPagoKhipu({
      idPago,
      datosPaciente: { ...datosPaciente, edad: edadNum },
      modulo,
      modoGuest: GUEST_DEFAULT === true ? true : false
    });

    window.location.href = urlPago; // abre Khipu o retorno guest
  } catch (err) {
    alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
  }
}

// Simular pago guest (redirige a ?pago=ok&idPago=...) — ahora con módulo
export async function simularPagoGuest(datosPaciente, modulo = 'trauma') {
  const prefix = modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago';
  const idPago = generarIdPago(prefix);
  const d = datosPaciente || { nombre: 'Guest', rut: '99999999-9', edad: 30, dolor: 'Rodilla', lado: 'Izquierda' };

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify(d));
  }

  await guardarDatos(idPago, d, modulo);
  const urlGuest = await crearPagoKhipu({ idPago, datosPaciente: d, modulo, modoGuest: true });
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

// === (Opcional) Descarga PDF según módulo ===
// Útil si quieres una sola función en lugar de 3 distintas en cada módulo.
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

// Descarga PDF trauma (compat con tu código existente)
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
