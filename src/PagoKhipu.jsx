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

/* ==================== Detección de GUEST ==================== */
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

/* ================= Helpers de lectura y validación ================= */
async function obtenerDatosExistentes(idPago, modulo = "trauma") {
  if (!idPago) return null;
  try {
    let url;
    if (modulo === "preop") {
      url = joinURL(BACKEND_BASE, `/obtener-datos-preop/${encodeURIComponent(idPago)}`);
    } else if (modulo === "generales") {
      url = joinURL(BACKEND_BASE, `/obtener-datos-generales/${encodeURIComponent(idPago)}`);
    } else {
      url = joinURL(BACKEND_BASE, `/obtener-datos/${encodeURIComponent(idPago)}`);
    }
    const { ok, data } = await fetchJSON(url, { method: "GET" });
    if (!ok || !data?.ok) return null;
    return data.datos || null;
  } catch {
    return null;
  }
}

// ¿El cliente intenta borrar algo que ya existe en el server?
function esParcheDestructivo(server = {}, cliente = {}) {
  for (const [k, vCliente] of Object.entries(cliente || {})) {
    const vServer = server?.[k];

    // si el server NO tiene valor previo, no hay conflicto
    if (vServer === undefined || vServer === null) continue;

    // string vacío pisa string no vacío => destructivo
    if (typeof vCliente === "string" && vCliente.trim() === "" &&
        typeof vServer === "string" && vServer.trim() !== "") {
      return true;
    }
    // array vacío pisa array no vacío => destructivo
    if (Array.isArray(vCliente) && vCliente.length === 0 &&
        Array.isArray(vServer) && vServer.length > 0) {
      return true;
    }
    // objeto vacío pisa objeto no vacío => destructivo
    if (vCliente && typeof vCliente === "object" && !Array.isArray(vCliente) &&
        Object.keys(vCliente).length === 0 &&
        vServer && typeof vServer === "object" && !Array.isArray(vServer) &&
        Object.keys(vServer).length > 0) {
      return true;
    }
  }
  return false;
}

// Tomar SOLO campos no vacíos del cliente (para aplicar sobre server sin borrar)
function soloCamposNoVacios(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === "string") { if (v.trim() === "") continue; out[k] = v; continue; }
    if (Array.isArray(v)) { if (v.length === 0) continue; out[k] = v; continue; }
    if (v && typeof v === "object") { if (Object.keys(v).length === 0) continue; out[k] = v; continue; }
    out[k] = v; // number, boolean, null explícito
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

  // Requisitos mínimos
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

  // Setear id/modulo para flujos posteriores
  if (typeof window !== "undefined") {
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", modulo);
  }

  // 1) Leer lo que ya existe en backend (si existe)
  const server = await obtenerDatosExistentes(idPago, modulo);

  // 2) Preparar datos del cliente (normalizamos edad a número)
  const cliente = { ...datosPaciente, edad: edadNum };

  // 3) Si existe server, validar que el cliente NO borre nada: si es destructivo → cancelar
  if (server && esParcheDestructivo(server, cliente)) {
    alert("Detectamos datos vacíos que borrarían información ya guardada. Corrige y vuelve a intentar.");
    return;
  }

  // 4) Construir payload a guardar:
  //    - Si NO hay server → guarda cliente tal cual.
  //    - Si HAY server → aplicar SOLO campos no vacíos del cliente encima del server (preserva resto).
  const payload = server ? { ...server, ...soloCamposNoVacios(cliente) } : cliente;

  // 5) Persistir ANTES de crear el pago
  await guardarDatos(idPago, payload, modulo);

  // 6) Guardar la versión final en sessionStorage (evita reinyectar obsoletos)
  if (typeof window !== "undefined") {
    try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(payload)); } catch {}
  }

  // 7) Guest: marcar modoGuest (el backend devolverá URL directa de retorno)
  const modoGuest = esGuest(payload);

  const urlPago = await crearPagoKhipu({
    idPago,
    datosPaciente: payload,
    modulo,
    modoGuest,
  });

  // 8) Redirección
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

  // Limpieza post-descarga
  try { sessionStorage.removeItem("idPago"); } catch {}
}
