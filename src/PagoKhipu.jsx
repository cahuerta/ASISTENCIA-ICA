// src/PagoKhipu.jsx
// Frontend: inicia pago llamando al backend y redirige a la URL que éste responda.

// ---- Resolución de BACKEND_BASE (Vite / Next / window.__ENV__)
const BACKEND_BASE =
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_BASE) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

// Une la base con una ruta evitando dobles barras
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
    try {
      data = JSON.parse(raw);
    } catch {
      // si el backend devuelve HTML/errores no-JSON, lo exponemos en raw
    }
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

export async function crearPagoKhipu({
  idPago,
  datosPaciente,
  modulo = "trauma",
  modoGuest = false,
}) {
  // Soporta ambos endpoints del backend: /crear-pago-khipu (nuevo) y /crear-pago (alias)
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
  return data.url; // URL de Khipu (real) o retorno (guest)
}

// ====== CAMBIO ÚNICO: validación según el módulo ======
export async function irAPagoKhipu(datosPaciente, opts = {}) {
  // Detectar módulo antes de validar
  const modulo = (
    opts?.modulo ||
    (typeof window !== "undefined" && sessionStorage.getItem("modulo")) ||
    "trauma"
  ).toLowerCase();

  // Validación mínima por módulo
  const edadNum = Number(datosPaciente?.edad);
  const faltantes = [];

  if (!datosPaciente?.nombre?.trim()) faltantes.push("nombre");
  if (!datosPaciente?.rut?.trim()) faltantes.push("RUT");
  if (!Number.isFinite(edadNum) || edadNum <= 0) faltantes.push("edad (>0)");

  if (modulo === "trauma") {
    // Sólo TRAUMA requiere dolor/zona
    if (!datosPaciente?.dolor?.trim()) faltantes.push("dolor/zona");
  } else if (modulo === "preop" || modulo === "generales") {
    // PREOP y GENERALES requieren género, no exigen dolor ni tipo de cirugía
    if (!datosPaciente?.genero?.trim())
      faltantes.push("género (MASCULINO/FEMENINO)");
  }

  if (faltantes.length) {
    alert("Complete los siguientes campos antes de pagar: " + faltantes.join(", "));
    return;
  }

  const idPago =
    opts?.idPago ||
    generarIdPago(
      modulo === "preop" ? "preop" : modulo === "generales" ? "generales" : "pago"
    );

  if (typeof window !== "undefined") {
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", modulo);
    sessionStorage.setItem(
      "datosPacienteJSON",
      JSON.stringify({ ...datosPaciente, edad: edadNum })
    );
  }

  // 1) guarda datos para que el backend pueda generar el PDF con el mismo contenido
  await guardarDatos(idPago, { ...datosPaciente, edad: edadNum }, modulo);

  // 2) crea pago y redirige
  const urlPago = await crearPagoKhipu({
    idPago,
    datosPaciente: { ...datosPaciente, edad: edadNum },
    modulo,
    modoGuest: false,
  });

  window.location.href = urlPago;
}

// Compat: descarga PDF “trauma”
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
