// src/PagoFlow.jsx
// Frontend: inicia pago Flow llamando al backend y redirige a la URL que éste responda.
// Mismo patrón y helpers que en PagoKhipu.jsx para mantener compatibilidad.

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
    try {
      data = JSON.parse(raw);
    } catch {}
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

export async function crearPagoFlow({
  idPago,
  datosPaciente,
  modulo = "trauma",
  modoGuest = false,
}) {
  // ⬅️ Endpoint gemelo al de Khipu, pero para Flow
  const url = joinURL(BACKEND_BASE, "/crear-pago-flow");
  const { ok, status, data, raw } = await fetchJSON(url, {
    method: "POST",
    body: JSON.stringify({ idPago, datosPaciente, modulo, modoGuest }),
  });

  if (!ok || !data?.ok || !data?.url || !data?.token) {
    const det =
      data?.detail && typeof data.detail === "object"
        ? `\n${JSON.stringify(data.detail)}`
        : raw
        ? `\n${raw}`
        : "";
    const msg = data?.error || `Fallo HTTP ${status}`;
    throw new Error(`${msg}${det}`);
  }

  // Devolvemos todo lo necesario para construir la URL final
  return {
    url: data.url,
    token: data.token,
    flowOrder: data.flowOrder ?? null,
  };
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
  const nombreOk =
    String(datos?.nombre || "").trim().toLowerCase() === "guest";
  const rutOk = normRut(datos?.rut) === normRut(GUEST_PERFIL.rut);
  return nombreOk && rutOk;
}

/* ================= Helpers de lectura y validación ================= */
async function obtenerDatosExistentes(idPago, modulo = "trauma") {
  if (!idPago) return null;
  try {
    let url;
    if (modulo === "preop") {
      url = joinURL(
        BACKEND_BASE,
        `/obtener-datos-preop/${encodeURIComponent(idPago)}`
      );
    } else if (modulo === "generales") {
      url = joinURL(
        BACKEND_BASE,
        `/obtener-datos-generales/${encodeURIComponent(idPago)}`
      );
    } else {
      url = joinURL(
        BACKEND_BASE,
        `/obtener-datos/${encodeURIComponent(idPago)}`
      );
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
    if (vServer === undefined || vServer === null) continue;

    if (
      typeof vCliente === "string" &&
      vCliente.trim() === "" &&
      typeof vServer === "string" &&
      vServer.trim() !== ""
    )
      return true;

    if (
      Array.isArray(vCliente) &&
      vCliente.length === 0 &&
      Array.isArray(vServer) &&
      vServer.length > 0
    )
      return true;

    if (
      vCliente &&
      typeof vCliente === "object" &&
      !Array.isArray(vCliente) &&
      Object.keys(vCliente).length === 0 &&
      vServer &&
      typeof vServer === "object" &&
      !Array.isArray(vServer) &&
      Object.keys(vServer).length > 0
    )
      return true;
  }
  return false;
}

// Tomar SOLO campos no vacíos del cliente (para aplicar sobre server sin borrar)
function soloCamposNoVacios(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;

    if (typeof v === "string") {
      if (v.trim() === "") continue;
      out[k] = v;
      continue;
    }

    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out[k] = v;
      continue;
    }

    if (v && typeof v === "object") {
      if (Object.keys(v).length === 0) continue;
      out[k] = v;
      continue;
    }

    // number, boolean, null explícito
    out[k] = v;
  }
  return out;
}

/* ==================== Flujo principal ==================== */
export async function irAPagoFlow(datosPaciente, opts = {}) {
  const modulo = (
    opts?.modulo ||
    (typeof window !== "undefined" && sessionStorage.getItem("modulo")) ||
    "trauma"
  ).toLowerCase();

  const edadNum = Number(datosPaciente?.edad);

  // Requisitos mínimos (idéntico a Khipu)
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

  // ✅ IMPORTANTE: respetar idPago existente (PantallaTres / Generales) antes de generar uno nuevo
  const idPago =
    opts?.idPago ||
    datosPaciente?.idPago ||
    (typeof window !== "undefined" && sessionStorage.getItem("idPago")) ||
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

  // 3) Validar que el cliente NO borre campos ya guardados (si existe server)
  if (server && esParcheDestructivo(server, cliente)) {
    alert(
      "Detectamos datos vacíos que borrarían información ya guardada. Corrige y vuelve a intentar."
    );
    return;
  }

  // 4) Construir payload final
  const payload = server ? { ...server, ...soloCamposNoVacios(cliente) } : cliente;

  // 5) Persistir ANTES de crear el pago
  await guardarDatos(idPago, payload, modulo);

  // 6) Cachear versión final
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(payload));
    } catch {}
  }

  // 7) Guest
  const modoGuest = esGuest(payload);

  // 8) Crear pago (Flow) y redirigir
  const pagoFlow = await crearPagoFlow({
    idPago,
    datosPaciente: payload,
    modulo,
    modoGuest,
  });

  const { url, token } = pagoFlow;

  if (typeof window !== "undefined") {
    // Flow exige que la URL de pay.php reciba el token por querystring
    window.location.href = `${url}?token=${encodeURIComponent(token)}`;
  } else {
    return `${url}?token=${encodeURIComponent(token)}`;
  }
}
