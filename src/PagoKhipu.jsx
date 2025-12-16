// src/PagoKhipu.jsx
// Frontend: inicia pago llamando al backend y redirige a la URL que éste responda.
// ❗ NO genera idPago. Usa el idPago ya creado por los módulos.

const BACKEND_BASE =
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_BASE) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

/* ================= Utils ================= */

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
    } catch {}

    return { ok: r.ok, status: r.status, data, raw };
  } finally {
    clearTimeout(t);
  }
}

/* ================= Guest ================= */

const GUEST_PERFIL = {
  nombre: "Guest",
  rut: "11.111.111-1",
};

function normRut(str) {
  return String(str || "").replace(/[^0-9kK]/g, "").toUpperCase();
}

function esGuest(datos) {
  const nombreOk =
    String(datos?.nombre || "").trim().toLowerCase() === "guest";
  const rutOk = normRut(datos?.rut) === normRut(GUEST_PERFIL.rut);
  return nombreOk && rutOk;
}

/* ================= Backend helpers ================= */

async function guardarDatos(idPago, datosPaciente, modulo = "trauma") {
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
    throw new Error(
      `No se pudieron guardar los datos antes del pago. ${msg}`
    );
  }
}

async function crearPagoKhipu({
  idPago,
  datosPaciente,
  modulo = "trauma",
  modoGuest = false,
}) {
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

/* ==================== FLUJO PRINCIPAL ==================== */

export async function irAPagoKhipu(datosPaciente, opts = {}) {
  const modulo = (
    opts?.modulo ||
    (typeof window !== "undefined" && sessionStorage.getItem("modulo")) ||
    "trauma"
  ).toLowerCase();

  /* ======================================================
     🔒 idPago: ÚNICA FUENTE DE VERDAD
     ====================================================== */
  const idPago =
    opts?.idPago ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("idPago")
      : null);

  if (!idPago) {
    throw new Error(
      "idPago NO existe. Debe ser generado por el módulo antes de pagar."
    );
  }

  /* ======================================================
     Validaciones mínimas
     ====================================================== */
  const edadNum = Number(datosPaciente?.edad);

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

  /* ======================================================
     Normalización payload
     ====================================================== */
  const payload = {
    ...datosPaciente,
    edad: edadNum,
  };

  /* ======================================================
     Persistir ANTES del pago
     ====================================================== */
  await guardarDatos(idPago, payload, modulo);

  /* ======================================================
     Guest
     ====================================================== */
  const modoGuest = esGuest(payload);

  /* ======================================================
     Crear pago en backend
     ====================================================== */
  const urlPago = await crearPagoKhipu({
    idPago,
    datosPaciente: payload,
    modulo,
    modoGuest,
  });

  /* ======================================================
     Redirección
     ====================================================== */
  if (typeof window !== "undefined") {
    window.location.href = urlPago;
  } else {
    return urlPago;
  }
}

/* ==================== Descargar PDF ==================== */

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
}
