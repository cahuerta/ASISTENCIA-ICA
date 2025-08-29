// src/PagoKhipu.jsx
// Frontend: crea el cobro DIRECTO en Khipu usando variables de entorno públicas (NEXT_PUBLIC_*)
// Mantiene modo invitado (guest) y flujo modular ('trauma' | 'preop' | 'generales').
// Guarda datos en backend ANTES de ir a Khipu para que luego puedas descargar el PDF por idPago.

const ENV = (typeof process !== 'undefined' && process.env) || {};
const WINENV = (typeof window !== 'undefined' && window.__ENV__) || {};

// === Config de Backend (para guardar datos y descargar PDFs)
const BACKEND_BASE =
  ENV.NEXT_PUBLIC_BACKEND_BASE ||
  WINENV.BACKEND_BASE ||
  'https://asistencia-ica-backend.onrender.com';

// === Config de Khipu (cliente → expone SECRET: ojo con seguridad; lo pides así)
const KHIPU_ENDPOINT =
  (ENV.NEXT_PUBLIC_KHIPU_ENDPOINT || WINENV.KHIPU_ENDPOINT || 'https://khipu.com/api/2.0').replace(/\/+$/, '');

const KHIPU_RECEIVER_ID =
  ENV.NEXT_PUBLIC_KHIPU_RECEIVER_ID || WINENV.KHIPU_RECEIVER_ID;

const KHIPU_SECRET =
  ENV.NEXT_PUBLIC_KHIPU_SECRET || WINENV.KHIPU_SECRET;

// URLs de retorno
const RETURN_BASE =
  ENV.NEXT_PUBLIC_RETURN_BASE || WINENV.RETURN_BASE || 'https://asistencia-ica.vercel.app';

const NOTIFY_URL =
  ENV.NEXT_PUBLIC_KHIPU_NOTIFY_URL || WINENV.KHIPU_NOTIFY_URL || undefined;

// Monto por módulo
const AMOUNTS = {
  trauma: Number(ENV.NEXT_PUBLIC_KHIPU_AMOUNT_TRAUMA || WINENV.KHIPU_AMOUNT_TRAUMA || 0),
  preop: Number(ENV.NEXT_PUBLIC_KHIPU_AMOUNT_PREOP || WINENV.KHIPU_AMOUNT_PREOP || 0),
  generales: Number(ENV.NEXT_PUBLIC_KHIPU_AMOUNT_GENERALES || WINENV.KHIPU_AMOUNT_GENERALES || 0),
};
const DEFAULT_AMOUNT = Number(ENV.NEXT_PUBLIC_KHIPU_AMOUNT_DEFAULT || WINENV.KHIPU_AMOUNT_DEFAULT || 1) || 1;

// Permite forzar modo invitado por env
const GUEST_DEFAULT =
  (ENV.NEXT_PUBLIC_KHIPU_GUEST === '1') ||
  (WINENV.KHIPU_GUEST === '1');

// Utilidad: fetch con timeout
async function fetchJSON(url, options = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, data, raw: text };
  } finally {
    clearTimeout(t);
  }
}

// Base64 para header Basic
function basicAuthHeader(id, secret) {
  try {
    if (typeof window !== 'undefined' && window.btoa) {
      return 'Basic ' + window.btoa(`${id}:${secret}`);
    }
    // fallback (SSR / Node)
    // eslint-disable-next-line no-undef
    return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
  } catch {
    // último intento
    // eslint-disable-next-line no-undef
    return 'Basic ' + (typeof btoa === 'function' ? btoa(`${id}:${secret}`) : '');
  }
}

// Genera un id único de pago (prefijo por módulo)
export function generarIdPago(prefix = 'pago') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

// Guarda datos previos al pago en el backend (por módulo) — NECESARIO para luego descargar PDF
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

// Crea el pago REAL directamente en Khipu
async function khipuCreatePayment({ idPago, modulo = 'trauma' }) {
  if (!KHIPU_RECEIVER_ID || !KHIPU_SECRET) {
    throw new Error('Faltan NEXT_PUBLIC_KHIPU_RECEIVER_ID o NEXT_PUBLIC_KHIPU_SECRET');
  }
  const subjectMap = {
    trauma: 'Pago Orden Médica Imagenológica',
    preop: 'Pago Exámenes Preoperatorios',
    generales: 'Pago Exámenes Generales',
  };
  const subject = subjectMap[modulo] || 'Pago Servicios Médicos';
  const amount = AMOUNTS[modulo] > 0 ? AMOUNTS[modulo] : DEFAULT_AMOUNT;

  const return_url = `${RETURN_BASE}?pago=ok&idPago=${encodeURIComponent(idPago)}`;
  const cancel_url = `${RETURN_BASE}?pago=cancelado&idPago=${encodeURIComponent(idPago)}`;

  const r = await fetch(`${KHIPU_ENDPOINT}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': basicAuthHeader(KHIPU_RECEIVER_ID, KHIPU_SECRET),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject,
      amount,
      currency: 'CLP',
      transaction_id: idPago,
      custom: modulo,
      return_url,
      cancel_url,
      ...(NOTIFY_URL ? { notify_url: NOTIFY_URL } : {}),
    }),
  });

  if (!r.ok) {
    const errorText = await r.text().catch(() => '');
    throw new Error(`Khipu HTTP ${r.status} ${errorText || ''}`);
  }
  const data = await r.json();
  const url = data.payment_url || data.app_url || data.paymentURL || null;
  if (!url) throw new Error('Khipu no devolvió payment_url');
  return url;
}

/**
 * Flujo completo:
 *  - valida datos
 *  - decide módulo ('trauma' | 'preop' | 'generales')
 *  - genera idPago con prefijo
 *  - guarda en sessionStorage
 *  - guarda datos en backend
 *  - si guest: simula retorno
 *  - si real: crea pago en Khipu y redirige
 */
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

  const moduloSS = (typeof window !== 'undefined' && sessionStorage.getItem('modulo')) || null;
  const moduloOpt = (opts?.modulo || moduloSS || '').toLowerCase();
  const modulo = ['trauma', 'preop', 'generales'].includes(moduloOpt) ? moduloOpt : 'trauma';

  const idPago = opts?.idPago || generarIdPago(
    modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago'
  );

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify({ ...datosPaciente, edad: edadNum }));
  }

  // Guarda los datos en backend (para luego descargar PDF por idPago)
  await guardarDatos(idPago, { ...datosPaciente, edad: edadNum }, modulo);

  // Guest?
  const modoGuest = (opts?.modoGuest === true) || GUEST_DEFAULT === true;
  if (modoGuest) {
    const urlGuest = `${RETURN_BASE}?pago=ok&idPago=${encodeURIComponent(idPago)}&guest=1`;
    window.location.href = urlGuest;
    return;
  }

  // Real Khipu directo desde el front
  try {
    const urlPago = await khipuCreatePayment({ idPago, modulo });
    window.location.href = urlPago;
  } catch (err) {
    alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
  }
}

// Simular pago guest explícito
export async function simularPagoGuest(datosPaciente, modulo = 'trauma') {
  const idPago = generarIdPago(
    modulo === 'preop' ? 'preop' : modulo === 'generales' ? 'generales' : 'pago'
  );

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('idPago', idPago);
    sessionStorage.setItem('modulo', modulo);
    sessionStorage.setItem('datosPacienteJSON', JSON.stringify(datosPaciente));
  }

  await guardarDatos(idPago, datosPaciente, modulo);
  const urlGuest = `${RETURN_BASE}?pago=ok&idPago=${encodeURIComponent(idPago)}&guest=1`;
  window.location.href = urlGuest;
}

// Leer retorno
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

// Descarga según módulo (después del retorno ok)
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

// Compat: descarga trauma por nombre fijo
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
