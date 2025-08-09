// src/PagoKhipu.jsx

// 👇 Ajusta si usas otra URL de backend
const BACKEND_BASE = 'https://asistencia-ica-backend.onrender.com';

// Genera un id único de pago
export function generarIdPago() {
  return 'pago_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// Guarda datos previos al pago en el backend
export async function guardarDatos(idPago, datosPaciente) {
  const r = await fetch(`${BACKEND_BASE}/guardar-datos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, datosPaciente }),
  });
  const j = await r.json();
  if (!j?.ok) throw new Error('No se pudieron guardar los datos antes del pago');
  return true;
}

// Crea el pago en el backend (usa modoGuest para prueba o real para Khipu API)
// ⚠️ La integración API REAL de Khipu se hace en el BACKEND (con secreto). El frontend solo pide la URL.
export async function crearPagoKhipu({ idPago, datosPaciente, modoGuest = false }) {
  const r = await fetch(`${BACKEND_BASE}/crear-pago-khipu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPago, modoGuest, datosPaciente }),
  });
  const j = await r.json();
  if (!j?.ok || !j?.url) {
    // ⬇️ Propagamos detalle del backend para depurar rápido
    const msg = `${j?.error || 'No se pudo crear el pago'}${j?.detail ? `\n${j.detail}` : ''}`;
    throw new Error(msg);
  }
  return j.url; // URL para redirigir (guest -> returnUrl; real -> payment_url de Khipu)
}

// Flujo completo: guardar datos -> pedir URL de pago -> redirigir
export async function irAPagoKhipu(datosPaciente) {
  // Validaciones mínimas
  if (!datosPaciente?.nombre || !datosPaciente?.rut || !datosPaciente?.edad || !datosPaciente?.dolor) {
    alert('Complete todos los campos antes de pagar');
    return;
  }

  const idPago = generarIdPago();
  // Guarda el idPago localmente (se usa luego para descargar PDF)
  sessionStorage.setItem('idPago', idPago);

  try {
    // 1) Guardar datos
    await guardarDatos(idPago, datosPaciente);

    // 2) Crear pago (real, sin guest)
    const urlPago = await crearPagoKhipu({ idPago, datosPaciente, modoGuest: false });

    // 3) Redirigir a Khipu
    window.location.href = urlPago;
  } catch (err) {
    // ⬇️ Mostramos el error exacto (incluye detail del backend si viene)
    alert(`No se pudo generar el link de pago.\n${err.message || err}`);
  }
}

// Simular pago guest (usa el mismo endpoint pero con modoGuest: true)
export async function simularPagoGuest(datosPaciente) {
  // Si no pasan datos, armo unos de ejemplo
  const d = datosPaciente || {
    nombre: 'Guest',
    rut: '99999999-9',
    edad: 30,
    dolor: 'Rodilla',
    lado: 'Izquierda',
  };

  const idPago = generarIdPago();
  sessionStorage.setItem('idPago', idPago);

  // Opcional: guardar datos antes, aunque el backend puede guardarlos dentro del propio /crear-pago-khipu guest
  await guardarDatos(idPago, d);

  // Pedir URL guest (redirige a ?pago=ok&idPago=...)
  const urlGuest = await crearPagoKhipu({ idPago, datosPaciente: d, modoGuest: true });
  window.location.href = urlGuest;
}

// Lee el retorno ?pago=ok&idPago=... y devuelve estado para tu App.jsx
export function leerRetornoPago() {
  const params = new URLSearchParams(window.location.search);
  const estado = params.get('pago');         // 'ok' | 'cancelado' | null
  const idPagoURL = params.get('idPago');    // puede venir vacío si no hubo return

  if (estado === 'ok' && idPagoURL) {
    sessionStorage.setItem('idPago', idPagoURL);
    return { pagoRealizado: true, idPago: idPagoURL, cancelado: false };
  }
  if (estado === 'cancelado') {
    return { pagoRealizado: false, idPago: null, cancelado: true };
  }
  return { pagoRealizado: false, idPago: null, cancelado: false };
}

// Descarga el PDF usando el idPago (guardado en sessionStorage o pasado explícito)
export async function descargarPDF(nombreArchivo = 'orden.pdf', idPagoParam) {
  const idPago = idPagoParam || sessionStorage.getItem('idPago');
  if (!idPago) {
    alert('ID de pago no encontrado');
    return;
  }

  const res = await fetch(`${BACKEND_BASE}/pdf/${encodeURIComponent(idPago)}`);
  if (!res.ok) throw new Error('Error al obtener el PDF');

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
