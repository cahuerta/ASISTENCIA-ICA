// src/PagoKhipu.jsx
// Frontend: inicia pago llamando al backend y redirige a la URL que éste responda.

const BACKEND_BASE =
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_BASE) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

function joinURL(base, path) {
  if (!base) return path;
  const b = String(base).replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

async function fetchJSON(url, options = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const raw = await r.text();
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, data, raw };
  } finally {
    clearTimeout(t);
  }
}

export function generarIdPago(prefix = "pago") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

export async function guardarDatos(idPago, datosPaciente, modulo = "trauma") {
  const route =
    modulo === "preop"
      ? "/guardar-datos-preop"
      : modulo === "generales"
      ? "/guardar-datos-generales"
      : "/guardar-datos";

  const url = joinURL(BACKEND_BASE, route);
  const { ok, data, status, raw } = await fetchJSON(url, {
    method: "POST",
    body: JSON.stringify({ idPago, datosPaciente }),
  });

  if (!ok || !data?.ok) {
    const msg = data?.error || `Error ${status}${raw ? `: ${raw}` : ""}`;
    throw new Error(`No se pudieron guardar los datos antes del pago. ${msg}`);
  }
  return true;
}

export async function crearPagoKhipu({ idPago, datosPaciente, modulo = "trauma", modoGuest = false }) {
  const url = joinURL(BACKEND_BASE, "/crear-pago-khipu");
  const { ok, status, data, raw } = await fetchJSON(url, {
    method: "POST",
    body: JSON.stringify({ idPago, datosPaciente, modulo, modoGuest }),
  });

  if (!ok || !data?.ok || !data?.url) {
    const det =
      data?.detail && typeof data.detail === "object"
        ? `\n${JSON.stringify(data.detail)}`
        : raw
        ? `\n${raw}`
        : "";
    const msg = data?.error || `Fallo HTTP ${status}`;
    throw new Error(`${msg}${det}`);
  }
  return data.url;
}

/* ==================== Detección de GUEST (solo para marcar modoGuest) ==================== */
const GUEST_PERFIL = {
  nombre: "Guest",
  rut: "11.111.111-1",
};

function normRut(str) {
  return String(str || "").replace(/[^0-9kK]/g, "").toUpperCase();
}
function esGuest(datos) {
  const nombreOk = String(datos?.nombre || "").trim().toLowerCase() === "guest";
  const rutOk = normRut(datos?.rut) === normRut(GUEST_PERFIL.rut);
  return nombreOk && rutOk;
}

/* ================= Helper: obtener datos ya guardados en backend (según modulo) ================ */
async function obtenerDatosExistentes(idPago, modulo = "trauma") {
  if (!idPago) return null;
  try {
    let url;
    if (modulo === "preop") {
      url = joinURL(BACKEND_BASE, `/obtener-datos-preop/${encodeURIComponent(idPago)}`);
    } else if (modulo === "generales") {
      url = joinURL(BACKEND_BASE, `/obtener-datos-generales/${encodeURIComponent(idPago)}`);
    } else {
      // trauma
      url = joinURL(BACKEND_BASE, `/obtener-datos/${encodeURIComponent(idPago)}`);
    }
    const { ok, data } = await fetchJSON(url, { method: "GET" });
    if (!ok || !data?.ok) return null;
    return data.datos || null;
  } catch {
    return null;
  }
}

/* ================ Helper: merge no-destructivo cliente <- servidor =========================
   Reglas:
   - Si el cliente trae undefined o "" o [] no sobreescribirá campos existentes del servidor.
   - Si cliente trae campos válidos, los usa.
   - Para arrays: si cliente trae array no vacío lo usa; si vacío -> no pisa.
   - Para objetos simples, hacemos shallow merge (cliente tiene prioridad si tiene keys).
*/
function mergeNoDestructivo(server = {}, cliente = {}) {
  const out = { ...server };
  for (const [k, v] of Object.entries(cliente || {})) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue; // no pisar con array vacío
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      if (v.trim() === "") continue; // no pisar con string vacío
      out[k] = v;
      continue;
    }
    // objeto u otros (number, boolean, etc) -> aceptar (incluye null explícito)
    out[k] = v;
  }
  return out;
}

/* ==================== Flujo principal ==================== */
export async function irAPagoKhipu(datosPaciente, opts = {}) {
  const modulo = (
    opts?.modulo ||
    (typeof window !== "undefined" && sessionStorage.getItem("modulo")) ||
    "trauma"
  ).toLowerCase();

  const edadNum = Number(datosPaciente?.edad);

  // Validaciones estándar
  const baseIncompleto =
    !datosPaciente?.nombre?.trim() ||
    !datosPaciente?.rut?.trim() ||
    !Number.isFinite(edadNum) ||
    edadNum <= 0;

  const faltaDolor = modulo === "trauma" && !datosPaciente?.dolor?.trim();

  if (baseIncompleto || faltaDolor) {
    alert("Complete todos los campos antes de pagar");
    return;
  }

  const idPago =
    opts?.idPago ||
    generarIdPago(
      modulo === "preop" ? "preop" : modulo === "generales" ? "generales" : "pago"
    );

  // Guardamos temporalmente el idPago en sessionStorage (para otros flujos)
  if (typeof window !== "undefined") {
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", modulo);
  }

  // ---------- LÓGICA NUEVA: NO SOBREESCRIBIR
  // 1) Intentar obtener datos previamente guardados en backend para este idPago (si existen)
  let datosServer = null;
  try {
    datosServer = await obtenerDatosExistentes(idPago, modulo);
  } catch (e) {
    datosServer = null;
  }

  // 2) Hacemos merge no destructivo (server <- cliente)
  const clienteConEdad = { ...datosPaciente, edad: edadNum };
  const merged = datosServer ? mergeNoDestructivo(datosServer, clienteConEdad) : clienteConEdad;

  // 3) Actualizar sessionStorage con la versión mergeada (evita reinyeciones con datos viejos)
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(merged));
    } catch {}
  }

  // Persistimos antes de crear pago (tu backend luego hace merge no destructivo también)
  await guardarDatos(idPago, merged, modulo);

  // Guest real: pedir al backend que trate este pago como pagado (modoGuest)
  const modoGuest = esGuest(merged);

  const urlPago = await crearPagoKhipu({
    idPago,
    datosPaciente: merged,
    modulo,
    modoGuest,
  });

  // Redirección (para guest vuelve directo ?pago=ok&idPago=..., para normal va a Khipu)
  if (typeof window !== "undefined") {
    window.location.href = urlPago;
  } else {
    return urlPago;
  }
}

/* ==================== Descargar PDF (trauma) ==================== */
export async function descargarPDF(nombreArchivo = "orden.pdf", idPagoParam) {
  const idPago =
    idPagoParam ||
    (typeof window !== "undefined" ? sessionStorage.getItem("idPago") : null);

  if (!idPago) {
    alert("ID de pago no encontrado");
    return;
  }

  const url = joinURL(BACKEND_BASE, `/pdf/${encodeURIComponent(idPago)}`);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Error al obtener el PDF");

  const blob = await r.blob();
  const dlUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = dlUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(dlUrl);

  // === Cambio mínimo solicitado: borrar idPago para que no se valide automático después ===
  try { sessionStorage.removeItem("idPago"); } catch {}
}
