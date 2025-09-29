// src/modules/TraumaModulo.jsx
"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import FormularioResonancia from "../components/FormularioResonancia.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ================= Helpers ================= */
function ensureTraumaIdPago() {
  let id = sessionStorage.getItem("idPago");
  if (!id || !/^pago_|^trauma_/.test(id)) {
    id = `trauma_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", id);
  }
  return id;
}

function sexoPalabra(genero = "") {
  const s = String(genero).toUpperCase();
  return s === "FEMENINO" ? "mujer" : "hombre";
}

function resumenInicialTrauma(datos = {}) {
  const sexo = sexoPalabra(datos.genero);
  const edad = datos.edad ? `${datos.edad} años` : "";
  const zona =
    datos?.dolor
      ? `Dolor de ${datos.dolor}${datos?.lado ? " " + datos.lado : ""}`
      : "Motivo no especificado";
  return `${sexo} ${edad}. ${zona}. Se solicita evaluación imagenológica según clínica.`;
}

/** Normaliza y detecta si un texto hace referencia a resonancia magnética */
function isResonanciaTexto(t = "") {
  if (!t) return false;
  const s = t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const includes = [
    "resonancia magnetica",
    "resonancia nuclear",
    "magnetic resonance",
  ];
  if (includes.some((p) => s.includes(p))) return true;

  const regexes = [/\brm\b/i, /\brmn\b/i, /\brnm\b/i, /\bmri\b/i, /\birm\b/i];
  return regexes.some((re) => re.test(t));
}

/* === Lee y arma las secciones de puntos desde sessionStorage para cualquier zona === */
function leerSecciones(zonaKey, ladoFallback = "") {
  try {
    const rawExtra = sessionStorage.getItem(`${zonaKey}_seccionesExtra`);
    if (rawExtra) {
      const arr = JSON.parse(rawExtra);
      if (Array.isArray(arr) && arr.length) {
        return arr
          .filter((sec) => Array.isArray(sec?.lines) && sec.lines.length)
          .map((sec) => ({
            title:
              sec.title ||
              `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${ladoFallback} — puntos marcados`,
            lines: sec.lines,
          }));
      }
    }
  } catch {}

  try {
    const rawData = sessionStorage.getItem(`${zonaKey}_data`);
    if (rawData) {
      const d = JSON.parse(rawData);
      const lines = Array.isArray(d?.puntosSeleccionados) ? d.puntosSeleccionados : [];
      if (lines.length) {
        const lado = d?.lado || ladoFallback || "";
        return [
          {
            title: `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${lado} — puntos marcados`,
            lines,
          },
        ];
      }
    }
  } catch {}

  return [];
}

/* === Carga los "resumenes" por zona para enviar al backend ==================== */
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

/* ================= Componente ================= */
export default function TraumaModulo({
  initialDatos,
  onDetectarResonancia, // (datos)-> boolean | Promise<boolean>
  resumenResoTexto,     // (data)-> string (opcional para personalizar resumen)
}) {
  const T = getTheme();

  // 👉 variables CSS del tema para usar en app.css
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
  const [stepStarted, setStepStarted] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  const [examenesIA, setExamenesIA] = useState([]);
  const [diagnosticoIA, setDiagnosticoIA] = useState("");
  const [justificacionIA, setJustificacionIA] = useState("");

  const [resonanciaChecklist, setResonanciaChecklist] = useState(null);
  const [resonanciaResumenTexto, setResonanciaResumenTexto] = useState("");
  const [ordenAlternativa, setOrdenAlternativa] = useState("");

  const [requiereRM, setRequiereRM] = useState(false);
  const [bloqueaRM, setBloqueaRM] = useState(false);

  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  const [showRM, setShowRM] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    try {
      const ex = JSON.parse(sessionStorage.getItem("trauma_ia_examenes") || "[]");
      setExamenesIA(Array.isArray(ex) ? ex : []);
      setDiagnosticoIA(sessionStorage.getItem("trauma_ia_diagnostico") || "");
      setJustificacionIA(sessionStorage.getItem("trauma_ia_justificacion") || "");
      if (ex && ex.length) setStepStarted(true);
    } catch {}

    try {
      const ck = sessionStorage.getItem("resonanciaChecklist");
      const rs = sessionStorage.getItem("resonanciaResumenTexto");
      const alt = sessionStorage.getItem("ordenAlternativa");
      if (ck) setResonanciaChecklist(JSON.parse(ck));
      if (rs) setResonanciaResumenTexto(rs);
      if (alt) setOrdenAlternativa(alt);
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");
    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos/${idPago}`);
        } catch {}
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }, 2000);
    }

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, []);

  const seccionesMarcadores = useMemo(() => {
    const lado = datos?.lado || "";
    const zonas = ["rodilla", "mano", "hombro", "codo", "tobillo"];
    const out = [];
    for (const z of zonas) {
      const secs = leerSecciones(z, lado);
      if (secs.length) out.push(...secs);
    }
    return out;
  }, [datos?.lado]);

  /* -------- IA -------- */
  const handleContinuar = async () => {
    try {
      setLoadingIA(true);

      try {
        const saved = sessionStorage.getItem("datosPacienteJSON");
        if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}

      const idPago = ensureTraumaIdPago();
      sessionStorage.setItem("modulo", "trauma");

      const edadNum = Number(datos.edad) || datos.edad;

      const lado = datos?.lado || "";
      const rodillaMarcadores = loadMarcadoresPorZona("rodilla", lado);
      const manoMarcadores = loadMarcadoresPorZona("mano", lado);
      const hombroMarcadores = loadMarcadoresPorZona("hombro", lado);
      const codoMarcadores = loadMarcadoresPorZona("codo", lado);
      const tobilloMarcadores = loadMarcadoresPorZona("tobillo", lado);

      const body = {
        idPago,
        paciente: {
          ...datos,
          edad: edadNum,
        },
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
      };

      const resp = await fetch(`${BACKEND_BASE}/ia-trauma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const j = await resp.json();
      const ex = Array.isArray(j?.examenes) ? j.examenes.slice(0, 4) : [];
      const dx = typeof j?.diagnostico === "string" ? j.diagnostico : "";
      const just = typeof j?.justificacion === "string" ? j.justificacion : j?.resumen || "";

      try {
        sessionStorage.setItem("trauma_ia_examenes", JSON.stringify(ex));
        sessionStorage.setItem("trauma_ia_diagnostico", dx || "");
        sessionStorage.setItem("trauma_ia_justificacion", just || "");
      } catch {}

      setExamenesIA(ex);
      setDiagnosticoIA(dx);
      setJustificacionIA(just);

      const textoEx = ex.join("\n");
      let solicitaRM = false;

      if (typeof onDetectarResonancia === "function") {
        solicitaRM = await onDetectarResonancia({ ...datos, edad: edadNum, examen: textoEx });
      } else {
        solicitaRM = isResonanciaTexto(textoEx);
      }

      setRequiereRM(!!solicitaRM);
      setBloqueaRM(false);
      setResonanciaChecklist(null);
      setResonanciaResumenTexto("");

      setStepStarted(true);
    } catch (e) {
      alert("No fue posible obtener la información de IA (Trauma). Intenta nuevamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  const lanzarChecklistRM = async () => {
    if (!requiereRM) return;
    setShowRM(true);
  };

  const handleSaveRM = (form /*, { riesgos } */) => {
    setBloqueaRM(false);

    const resumen =
      typeof resumenResoTexto === "function"
        ? resumenResoTexto(form)
        : construirResumenRM(form);

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
    if (marcadas.length) {
      partes.push(marcadas.join("\n"));
    } else {
      partes.push("• Sin alertas marcadas en checklist.");
    }
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
      sessionStorage.setItem("modulo", "trauma");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

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
            examenesIA,
            diagnosticoIA,
            justificacionIA,
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
                  examenesIA,
                  diagnosticoIA,
                  justificacionIA,
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

  const usarIA = Array.isArray(examenesIA) && examenesIA.length > 0;

  return (
    <div className="trauma-card" style={rootVars}>
      <h3 className="trauma-title">Vista previa — Imagenología</h3>

      <div className="trauma-info">
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div><strong>Género:</strong> {datos?.genero || "—"}</div>
        <div><strong>Dolor:</strong> {datos?.dolor || "—"}</div>
        <div><strong>Lado:</strong> {datos?.lado || "—"}</div>
      </div>

      {/* Primer preview: SIEMPRE visible */}
      <div className="trauma-mono mt-6">{resumenInicialTrauma(datos)}</div>

      {/* Secciones de puntos */}
      {seccionesMarcadores.map((sec, idx) => (
        <div className="trauma-block" key={`sec-${idx}`}>
          <strong>{sec.title}</strong>
          <ul className="mt-6">
            {sec.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ))}

      {!stepStarted && (
        <button className="trauma-btn primary" onClick={handleContinuar} disabled={loadingIA}>
          {loadingIA ? "Analizando con IA…" : "Continuar"}
        </button>
      )}

      {stepStarted && (
        <>
          <div className="trauma-block">
            <strong>Diagnóstico presuntivo:</strong>
            <div className="trauma-mono mt-6">{diagnosticoIA || "—"}</div>
          </div>

          <div className="trauma-block">
            <strong>Exámenes sugeridos (IA):</strong>
            {usarIA ? (
              <ul className="mt-6">
                {examenesIA.map((e, i) => (
                  <li key={`${e}-${i}`}>{e}</li>
                ))}
              </ul>
            ) : (
              <div className="trauma-hint">Aún no hay lista generada por IA.</div>
            )}
          </div>

          {justificacionIA && (
            <div className="trauma-block">
              <strong>Justificación (≈100 palabras):</strong>
              <div className="trauma-mono mt-6">{justificacionIA}</div>
            </div>
          )}

          {requiereRM && !resonanciaChecklist && !bloqueaRM && (
            <div className="trauma-hint">
              La IA sugiere Resonancia Magnética. Presiona “Continuar” para completar el checklist
              de seguridad.
            </div>
          )}
          {bloqueaRM && (
            <div className="trauma-hint">
              RM contraindicada por checklist. {ordenAlternativa || "Se sugiere alternativa."}
            </div>
          )}

          {!pagoRealizado ? (
            <>
              {requiereRM && !resonanciaChecklist && !bloqueaRM && (
                <button className="trauma-btn primary mt-12" onClick={lanzarChecklistRM}>
                  Continuar
                </button>
              )}

              {(!requiereRM || resonanciaChecklist || bloqueaRM) && (
                <>
                  <button className="trauma-btn primary mt-12" onClick={handlePagar}>
                    Pagar ahora (Trauma)
                  </button>
                  <button
                    className="trauma-btn secondary mt-8"
                    title="Simular retorno pagado (solo pruebas)"
                    onClick={async () => {
                      const idPago = `trauma_guest_${Date.now()}`;
                      const datosGuest = {
                        nombre: "Guest",
                        rut: "99999999-9",
                        edad: 35,
                        genero: "MASCULINO",
                        dolor: "Rodilla",
                        lado: "Izquierda",
                      };

                      sessionStorage.setItem("idPago", idPago);
                      sessionStorage.setItem("modulo", "trauma");
                      sessionStorage.setItem(
                        "datosPacienteJSON",
                        JSON.stringify(datosGuest)
                      );

                      await fetch(`${BACKEND_BASE}/guardar-datos`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          idPago,
                          datosPaciente: {
                            ...datosGuest,
                            examenesIA,
                            diagnosticoIA,
                            justificacionIA,
                            rmForm: resonanciaChecklist,
                            rmObservaciones: resonanciaChecklist?.observaciones || "",
                          },
                          resonanciaChecklist,
                          resonanciaResumenTexto,
                          ordenAlternativa,
                        }),
                      });

                      const url = new URL(window.location.href);
                      url.searchParams.set("pago", "ok");
                      url.searchParams.set("idPago", idPago);
                      window.location.href = url.toString();
                    }}
                  >
                    Simular Pago (Guest)
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              className="trauma-btn primary mt-12"
              onClick={handleDescargar}
              disabled={descargando}
              title={mensajeDescarga || "Verificar y descargar"}
            >
              {descargando ? mensajeDescarga || "Verificando…" : "Descargar Documento"}
            </button>
          )}
        </>
      )}

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
