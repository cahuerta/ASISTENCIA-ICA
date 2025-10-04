// src/modules/TraumaModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import FormularioResonancia from "../components/FormularioResonancia.jsx";

/* ESQUEMA + MAPPER DINÁMICO */
import EsquemaAnterior from "../EsquemaAnterior.jsx";
import EsquemaPosterior from "../EsquemaPosterior.jsx";
import EsquemaToggleTabs from "../EsquemaToggleTabs.jsx";
import GenericMapper from "../mappers/GenericMapper.jsx";
import { hasMapper, resolveZonaKey } from "../mappers/mapperRegistry.js";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ================= Helpers ================= */
function ensureTraumaIdPago() {
  let id = null;
  try { id = sessionStorage.getItem("idPago"); } catch {}
  if (!id || !/^pago_|^trauma_/.test(id)) {
    id = `trauma_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    try { sessionStorage.setItem("idPago", id); } catch {}
  }
  return id;
}

function sexoPalabra(genero = "") {
  const s = String(genero).toUpperCase();
  return s === "FEMENINO" ? "mujer" : "hombre";
}

/* === Carga resúmenes por zona para enviar al backend (si se requiere) === */
function loadMarcadoresPorZona(zonaKey, ladoTexto = "") {
  const lado = (ladoTexto || "").toLowerCase();
  const side =
    lado.includes("izquierda") ? "izquierda" : lado.includes("derecha") ? "derecha" : "";
  if (!side) return null;
  try {
    const raw = sessionStorage.getItem(`${zonaKey}_resumen_${side}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* Construye/actualiza `${zona}_seccionesExtra` para que el preview liste puntos por zona/lado */
function syncSeccionesExtra(ladoFallback = "") {
  const zonas = ["rodilla", "mano", "hombro", "codo", "tobillo"];
  for (const z of zonas) {
    try {
      const raw = sessionStorage.getItem(`${z}_data`);
      const d = raw ? JSON.parse(raw) : null;
      const lines = Array.isArray(d?.puntosSeleccionados) ? d.puntosSeleccionados : [];
      const lado = (d?.lado || ladoFallback || "").trim();
      if (lines.length) {
        const titulo =
          `${z[0].toUpperCase()}${z.slice(1)}${lado ? ` ${lado}` : ""} — puntos marcados`.trim();
        const arr = [{ title: titulo, lines }];
        sessionStorage.setItem(`${z}_seccionesExtra`, JSON.stringify(arr));
      } else {
        sessionStorage.removeItem(`${z}_seccionesExtra`);
      }
    } catch {}
  }
}

/* ================= Componente ================= */
export default function TraumaModulo({
  initialDatos,
  resumenResoTexto,     // (data)-> string (opcional para personalizar resumen de RM)
  onIrPantallaTres,     // callback para navegar al preview (PantallaTres)
}) {
  const T = getTheme();

  // variables CSS del tema para usar en app.css
  const rootVars = {
    "--t-surface": T.surface ?? "#fff",
    "--t-text": T.text ?? "#1b1b1b",
    "--t-primary": T.primary ?? "#0072CE",
    "--t-primary-dark": T.primaryDark ?? T.primary ?? "#0072CE",
    "--t-on-primary": T.onPrimary ?? "#fff",
    "--t-border": T.border ?? "#e8e8e8",
    "--t-muted": T.muted ?? "#777",
    "--t-on-muted": T.onMuted ?? "#fff",
    "--t-code-bg": T.codeBg ?? "#f7f7f7",
    "--t-chip-bg": T.chipBg ?? "#eef6ff",
    "--t-chip-border": T.chipBorder ?? "#cfe4ff",
    "--t-chip-text": T.chipText ?? (T.primary || "#0b63c5"),
    "--t-shadow-sm": T.shadowSm ?? "0 2px 10px rgba(0,0,0,0.08)",
    "--t-text-muted": T.textMuted ?? "#666",
  };

  const [datos, setDatos] = useState(initialDatos || {});
  const [loading, setLoading] = useState(false);

  const [resonanciaChecklist, setResonanciaChecklist] = useState(null);
  const [resonanciaResumenTexto, setResonanciaResumenTexto] = useState("");
  const [ordenAlternativa, setOrdenAlternativa] = useState("");

  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  const [showRM, setShowRM] = useState(false);

  /* ESQUEMA + MAPPER */
  const [vista, setVista] = useState("anterior");
  const [mostrarMapper, setMostrarMapper] = useState(false);
  const [mapperId, setMapperId] = useState(null);

  const onSeleccionZona = (zona) => {
    let dolor = "", lado = "";
    const z = String(zona || "");
    const zl = z.toLowerCase();

    if (zl.includes("columna cervical")) { dolor = "Columna cervical"; lado = ""; }
    else if (zl.includes("columna dorsal")) { dolor = "Columna dorsal"; lado = ""; }
    else if (zl.includes("columna lumbar") || zl.includes("columna")) { dolor = "Columna lumbar"; lado = ""; }
    else if (zl.includes("cadera")) { dolor = "Cadera"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("rodilla")) { dolor = "Rodilla"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("hombro")) { dolor = "Hombro"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("codo")) { dolor = "Codo"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("mano")) { dolor = "Mano"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("tobillo")) { dolor = "Tobillo"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }

    setDatos((prev) => {
      const next = { ...prev, dolor, lado };
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
      return next;
    });

    const key = resolveZonaKey(dolor);
    if (key && hasMapper(key)) {
      setMapperId(key);
      setMostrarMapper(true); // abrir overlay automáticamente al elegir zona
    }
  };

  /* Montaje: restaurar datos y manejar retorno de pago */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    try {
      const ck = sessionStorage.getItem("resonanciaChecklist");
      const rs = sessionStorage.getItem("resonanciaResumenTexto");
      const alt = sessionStorage.getItem("ordenAlternativa");
      if (ck) setResonanciaChecklist(JSON.parse(ck));
      if (rs) setResonanciaResumenTexto(rs);
      if (alt) setOrdenAlternativa(alt);
    } catch {}

    // Retorno de pago (si aplica)
    try {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get("pago");
      const idPago = params.get("idPago") || sessionStorage.getItem("idPago");
      if (pago === "ok" && idPago) {
        setPagoRealizado(true);
        if (pollerRef.current) clearInterval(pollerRef.current);
        let intentos = 0;
        pollerRef.current = setInterval(async () => {
          intentos++;
          try { await fetch(`${BACKEND_BASE}/obtener-datos/${idPago}`); } catch {}
          if (intentos >= 30) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        }, 2000);
      }
    } catch {}

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, []);

  /* Cerrar overlay si mapper hijo emite eventos (compat mappers antiguos) */
  useEffect(() => {
    const close = () => setMostrarMapper(false);
    window.addEventListener("rodilla:volver", close);
    window.addEventListener("mapper:close", close);
    window.addEventListener("genericmapper:close", close);
    return () => {
      window.removeEventListener("rodilla:volver", close);
      window.removeEventListener("mapper:close", close);
      window.removeEventListener("genericmapper:close", close);
    };
  }, []);

  /* -------- “Continuar” → guarda lo necesario y navega a PantallaTres -------- */
  const handleContinuar = async () => {
    if (!datos?.dolor) return;
    setLoading(true);
    try {
      // Persistir paciente actualizado
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos)); } catch {}
      // Asegurar idPago (si luego se requiere)
      ensureTraumaIdPago();
      // Asegurar que el preview tenga las secciones por zona/lado
      syncSeccionesExtra(datos?.lado);

      // Navegar al preview (PantallaTres) usando el callback del padre
      onIrPantallaTres?.();
    } catch {
      alert("No fue posible continuar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRM = (form) => {
    const resumen =
      typeof resumenResoTexto === "function" ? resumenResoTexto(form) : construirResumenRM(form);
    setResonanciaChecklist(form);
    setResonanciaResumenTexto(resumen);
    try {
      sessionStorage.setItem("resonanciaChecklist", JSON.stringify(form));
      sessionStorage.setItem("resonanciaResumenTexto", resumen);
    } catch {}
    setShowRM(false);
  };

  const construirResumenRM = (f = {}) => {
    const labels = {
      marcapasos: "Marcapasos/DAI",
      coclear_o_neuro: "Implante coclear/neuroestimulador",
      clips_aneurisma: "Clips de aneurisma",
      valvula_cardiaca_metal: "Implante metálico intracraneal",
      fragmentos_metalicos: "Fragmentos metálicos/balas",
      protesis_placas_tornillos: "Prótesis/placas/tornillos",
      cirugia_reciente_3m: "Cirugía reciente (<3m) con implante",
      embarazo: "Embarazo o sospecha",
      claustrofobia: "Claustrofobia importante",
      peso_mayor_150: "Peso > 150 kg",
      no_permanece_inmovil: "Dificultad para inmovilidad",
      tatuajes_recientes: "Tatuajes/PMU < 6 semanas",
      piercings_no_removibles: "Piercings no removibles",
      bomba_insulina_u_otro: "Dispositivo externo activo",
      requiere_contraste: "Requiere contraste",
      erc_o_egfr_bajo: "Insuficiencia renal / eGFR < 30",
      alergia_gadolinio: "Alergia a gadolinio",
      reaccion_contrastes: "Reacción a contrastes previos",
      requiere_sedacion: "Requiere sedación",
      ayuno_6h: "Ayuno 6h (si sedación)",
    };

    const marcadas = Object.keys(labels)
      .filter((k) => f[k] === true)
      .map((k) => `• ${labels[k]}`);

    const obs = (f.observaciones || "").trim();

    const partes = [];
    if (marcadas.length) partes.push(marcadas.join("\n"));
    else partes.push("• Sin alertas marcadas en checklist.");
    if (obs) partes.push(`Observaciones: ${obs}`);
    return partes.join("\n");
  };

  const handlePagar = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datos.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return;
    }

    try {
      const idPago = ensureTraumaIdPago();
      try {
        sessionStorage.setItem("modulo", "trauma");
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));
      } catch {}

      // Asegurar que el preview tenga las secciones listas
      syncSeccionesExtra(datos?.lado);

      const lado = datos?.lado || "";
      const rodillaMarcadores = loadMarcadoresPorZona("rodilla", lado);
      const manoMarcadores = loadMarcadoresPorZona("mano", lado);
      const hombroMarcadores = loadMarcadoresPorZona("hombro", lado);
      const codoMarcadores = loadMarcadoresPorZona("codo", lado);
      const tobilloMarcadores = loadMarcadoresPorZona("tobillo", lado);

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: {
            ...datos,
            edad: edadNum,
            rmForm: resonanciaChecklist,
            rmObservaciones: resonanciaChecklist?.observaciones || "",
            rodillaMarcadores,
            marcadores: {
              rodilla: rodillaMarcadores,
              mano: manoMarcadores,
              hombro: hombroMarcadores,
              codo: codoMarcadores,
              tobillo: tobilloMarcadores,
            },
            manoMarcadores,
            hombroMarcadores,
            codoMarcadores,
            tobilloMarcadores,
          },
          resonanciaChecklist,
          resonanciaResumenTexto,
          ordenAlternativa,
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "trauma" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (trauma):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const handleDescargar = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `orden_${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    };

    setDescargando(true);
    setMensajeDescarga("Verificando pago…");

    let reinyectado = false;
    try {
      const maxIntentos = 30;
      for (let i = 1; i <= maxIntentos; i++) {
        const r = await intentaDescarga();
        if (r.ok) break;

        if (r.status === 402) {
          setMensajeDescarga(`Verificando pago… (${i}/${maxIntentos})`);
          await sleep(1500);
          if (i === maxIntentos) alert("El pago aún no se confirma. Intenta nuevamente.");
          continue;
        }

        if (r.status === 404) {
          if (!reinyectado) {
            setMensajeDescarga("Restaurando datos…");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datos;

            const lado = datosReinyectar?.lado || "";
            const rodillaMarcadores = loadMarcadoresPorZona("rodilla", lado);
            const manoMarcadores = loadMarcadoresPorZona("mano", lado);
            const hombroMarcadores = loadMarcadoresPorZona("hombro", lado);
            const codoMarcadores = loadMarcadoresPorZona("codo", lado);
            const tobilloMarcadores = loadMarcadoresPorZona("tobillo", lado);

            await fetch(`${BACKEND_BASE}/guardar-datos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: {
                  ...datosReinyectar,
                  rmForm: resonanciaChecklist,
                  rmObservaciones: resonanciaChecklist?.observaciones || "",
                  rodillaMarcadores,
                  marcadores: {
                    rodilla: rodillaMarcadores,
                    mano: manoMarcadores,
                    hombro: hombroMarcadores,
                    codo: codoMarcadores,
                    tobillo: tobilloMarcadores,
                  },
                  manoMarcadores,
                  hombroMarcadores,
                  codoMarcadores,
                  tobilloMarcadores,
                },
                resonanciaChecklist,
                resonanciaResumenTexto,
                ordenAlternativa,
              }),
            });

            reinyectado = true;
            await sleep(500);
            continue;
          } else {
            alert("No se pudo descargar el PDF después de reintentar.");
            break;
          }
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  const resumenInicialTrauma = (d = {}) => {
    const sexo = sexoPalabra(d.genero);
    const edad = d.edad ? `${d.edad} años` : "";
    const zona = d?.dolor
      ? `Dolor de ${d.dolor}${d?.lado ? " " + d.lado : ""}`
      : "Motivo no especificado";
    return `${sexo} ${edad}. ${zona}. Se solicita evaluación imagenológica según clínica.`;
  };

  return (
    <div className="trauma-card" style={rootVars}>
      {/* TÍTULO */}
      <h3 className="trauma-title">Identifica tu punto de dolor</h3>

      {/* BLOQUE SELECCIÓN (esquema + botón mapper) */}
      <>
        <EsquemaToggleTabs vista={vista} onChange={setVista} />
        {vista === "anterior" ? (
          <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={420} />
        ) : (
          <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={420} />
        )}

        <div className="trauma-hint mt-6">
          {datos?.dolor ? (
            <>
              Zona seleccionada:{" "}
              <strong>
                {datos.dolor}
                {datos.lado ? ` — ${datos.lado}` : ""}
              </strong>
              {mapperId && (
                <button
                  type="button"
                  className="trauma-btn ghost"
                  style={{ marginLeft: 8 }}
                  onClick={() => setMostrarMapper(true)}
                >
                  Marcar puntos
                </button>
              )}
            </>
          ) : (
            "Toca una zona en el esquema para continuar."
          )}
        </div>
      </>

      {/* SIN PREVIEW NI INFO ABAJO — solo botón que navega a PantallaTres */}
      <button
        className="trauma-btn primary"
        onClick={handleContinuar}
        disabled={loading || !datos?.dolor}
        aria-busy={loading}
        title={!datos?.dolor ? "Selecciona una zona primero" : ""}
      >
        {loading ? "Procesando…" : "Continuar"}
      </button>

      {/* Overlay Mapper */}
      {mostrarMapper && mapperId && (
        <div className="trauma-modal-backdrop" role="dialog" aria-modal="true">
          <div className="trauma-modal-card">
            <GenericMapper
              mapperId={mapperId}
              ladoInicial={(datos?.lado || "").toLowerCase().includes("izq") ? "izquierda" : "derecha"}
              vistaInicial={mapperId === "mano" ? (vista === "anterior" ? "palmar" : "dorsal") : vista}
              onSave={() => {
                // El mapper ya guarda en sessionStorage; consolidamos para el preview
                syncSeccionesExtra(datos?.lado);
                setMostrarMapper(false);
              }}
              onClose={() => setMostrarMapper(false)}
            />
          </div>
        </div>
      )}

      {/* Modal RM (no es preview de orden) */}
      {showRM && (
        <div className="trauma-modal-backdrop" role="dialog" aria-modal="true">
          <div className="trauma-modal-card">
            <FormularioResonancia
              initial={resonanciaChecklist || {}}
              onSave={handleSaveRM}
              onCancel={() => setShowRM(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
