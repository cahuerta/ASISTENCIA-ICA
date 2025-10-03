// src/App.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import "./app.css";

/* Esquemas */
import EsquemaAnterior from "./EsquemaAnterior.jsx";
import EsquemaPosterior from "./EsquemaPosterior.jsx";
import EsquemaToggleTabs from "./EsquemaToggleTabs.jsx";

/* Formularios y módulos */
import FormularioPaciente from "./FormularioPaciente.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";

/* PantallaDos (selector de módulos) */
import PantallaDos from "./PantallaDos.jsx";

/* Mapeadores */
import GenericMapper from "./mappers/GenericMapper.jsx";
import { hasMapper, resolveZonaKey } from "./mappers/mapperRegistry.js";

/* Utilidades */
import AvisoLegal from "./components/AvisoLegal.jsx";
import FormularioResonancia from "./components/FormularioResonancia.jsx";
import FormularioComorbilidades from "./components/FormularioComorbilidades.jsx";

/* Tema */
import { getTheme } from "./theme.js";
const T = getTheme();

/* CSS vars */
const cssVars = {
  "--bg": T.bg, "--surface": T.surface, "--border": T.border,
  "--text": T.text, "--text-muted": T.textMuted, "--muted": T.muted,
  "--primary": T.primary, "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
  "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm, "--shadow-md": T.shadowMd,
  "--overlay": T.overlay,
};

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: "", rut: "", edad: "", genero: "", dolor: "", lado: "",
  });

  const [modulo, setModulo] = useState("trauma");
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const pollerRef = useRef(null);

  const [vista, setVista] = useState("anterior");

  const [mostrarMapper, setMostrarMapper] = useState(false);
  const [mapperId, setMapperId] = useState(null);

  const [rmPdfListo, setRmPdfListo] = useState(() => {
    try { return sessionStorage.getItem("rm_pdf_disponible") === "1"; } catch { return false; }
  });
  const [rmIdPago, setRmIdPago] = useState(() => {
    try { return sessionStorage.getItem("rm_idPago") || ""; } catch { return ""; }
  });

  const avisoOkRef = useRef({ preop: false, generales: false });
  const comorbOkRef = useRef({ preop: false, generales: false });

  const getComorbStorageKey = (scope) => scope === "generales" ? "generales_comorbilidades_data" : "preop_comorbilidades_data";
  const getAvisoKey = (scope) => scope === "generales" ? "generales_aviso_ok" : "preop_aviso_ok";
  const getComorbOkKey = (scope) => scope === "generales" ? "generales_comorbilidades_ok" : "preop_comorbilidades_ok";

  useEffect(() => {
    try {
      avisoOkRef.current.preop = sessionStorage.getItem("preop_aviso_ok") === "1";
      avisoOkRef.current.generales = sessionStorage.getItem("generales_aviso_ok") === "1";
      comorbOkRef.current.preop = sessionStorage.getItem("preop_comorbilidades_ok") === "1";
      comorbOkRef.current.generales = sessionStorage.getItem("generales_comorbilidades_ok") === "1";
    } catch {}
  }, []);

  const marcarAvisoOk = (scope) => {
    avisoOkRef.current[scope] = true;
    try { sessionStorage.setItem(getAvisoKey(scope), "1"); } catch {}
  };
  const marcarComorbilidadesOk = (scope, payload) => {
    comorbOkRef.current[scope] = true;
    try {
      sessionStorage.setItem(getComorbOkKey(scope), "1");
      sessionStorage.setItem(getComorbStorageKey(scope), JSON.stringify(payload || {}));
    } catch {}
  };

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [pendingPreview, setPendingPreview] = useState(false);

  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    if (modulo === "preop" || modulo === "generales") marcarAvisoOk(modulo);
    if (pendingPreview) { setMostrarVistaPrevia(true); setPendingPreview(false); }
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    setPendingPreview(false);
    try { window.close(); } catch {}
    setTimeout(() => { if (!window.closed) window.location.href = "about:blank"; }, 0);
  };

  const [showReso, setShowReso] = useState(false);
  const [resolverReso, setResolverReso] = useState(null);
  const RED_FLAGS = new Set(["marcapasos","coclear_o_neuro","clips_aneurisma","valvula_cardiaca_metal","fragmentos_metalicos"]);
  const pedirChecklistResonancia = () => new Promise((resolve) => { setResolverReso(() => resolve); setShowReso(true); });
  const hasRedFlags = (data) => Object.entries(data || {}).some(([k, v]) => RED_FLAGS.has(k) && v === true);
  const resumenResoTexto = (data) => {
    const si = Object.entries(data || {}).filter(([_, v]) => v === true).map(([k]) => k).join(", ") || "—";
    const no = Object.entries(data || {}).filter(([_, v]) => v === false).map(([k]) => k).join(", ") || "—";
    return [
      "FORMULARIO DE SEGURIDAD PARA RESONANCIA MAGNÉTICA",
      `Sí: ${si}`,
      `No: ${no}`,
      "Declaro que la información es veraz y autorizo la realización del examen.",
      "Firma Paciente: ______________________     RUT: _______________     Fecha: ____/____/______",
    ].join("\n");
  };

  const esResonanciaTexto = (t = "") => {
    const s = (t || "").toLowerCase();
    return s.includes("resonancia") || s.includes("resonancia magn") || /\brm\b/i.test(t);
  };
  const detectarResonanciaEnBackend = async (datos) => {
    try {
      const r = await fetch(`${BACKEND_BASE}/detectar-resonancia`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datosPaciente: datos }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const flag = typeof j?.resonancia === "boolean" ? j.resonancia : esResonanciaTexto(j?.texto || j?.orden || "");
      sessionStorage.setItem("solicitaResonancia", flag ? "1" : "0");
      return !!flag;
    } catch {
      sessionStorage.setItem("solicitaResonancia", "0");
      return false;
    }
  };

  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);
  const [comorbilidades, setComorbilidades] = useState(() => {
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey("preop"));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  useEffect(() => {
    if (modulo !== "preop" && modulo !== "generales") return;
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey(modulo));
      setComorbilidades(raw ? JSON.parse(raw) : null);
    } catch { setComorbilidades(null); }
  }, [modulo]);

  const llamarPreopIA = async (payloadComorb) => {
    let idPago = "";
    try {
      idPago = sessionStorage.getItem("idPago") || "";
      if (!idPago) { idPago = `preop_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`; sessionStorage.setItem("idPago", idPago); }
    } catch {}

    let tipoCirugia = "";
    try {
      const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
      const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      tipoCirugia = fijo || otro || "";
    } catch {}

    let comorb = payloadComorb || comorbilidades;
    if (!comorb) {
      try {
        const raw = sessionStorage.getItem(getComorbStorageKey("preop"));
        if (raw) comorb = JSON.parse(raw);
      } catch {}
    }

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = { ...datosPaciente, edad: edadNum, genero: normalizarGenero(datosPaciente.genero) };

    const postIA = async (path) =>
      fetch(`${BACKEND_BASE}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, paciente, comorbilidades: comorb || {}, tipoCirugia }),
      });

    try {
      let resp = await postIA("/preop-ia");
      if (!resp.ok) resp = await postIA("/ia-preop");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const j = await resp.json();
      const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
      const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";
      try {
        sessionStorage.setItem("preop_ia_examenes", JSON.stringify(examenes));
        sessionStorage.setItem("preop_ia_resumen", resumen || "");
      } catch {}
      if (avisoOkRef.current.preop) { setMostrarVistaPrevia(true); setPendingPreview(false); }
      else { setPendingPreview(true); setMostrarAviso(true); }
    } catch {
      alert("No fue posible obtener la información de IA desde el backend. Intenta nuevamente.");
      setPendingPreview(false);
    }
  };

  const llamarGeneralesIA = async (payloadComorb) => {
    let idPago = "";
    try {
      idPago = sessionStorage.getItem("idPago") || "";
      if (!idPago) { idPago = `generales_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`; sessionStorage.setItem("idPago", idPago); }
    } catch {}

    let comorb = payloadComorb || comorbilidades;
    if (!comorb) {
      try {
        const raw = sessionStorage.getItem(getComorbStorageKey("generales"));
        if (raw) comorb = JSON.parse(raw);
      } catch {}
    }

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = { ...datosPaciente, edad: edadNum, genero: normalizarGenero(datosPaciente.genero) };
    const body = { idPago, paciente, comorbilidades: comorb || {} };

    try {
      let resp = await fetch(`${BACKEND_BASE}/ia-generales`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!resp.ok) {
        resp = await fetch(`${BACKEND_BASE}/preop-ia`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });
      }
      if (!resp.ok) {
        resp = await fetch(`${BACKEND_BASE}/ia-preop`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const j = await resp.json();
      const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
      const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";
      try {
        sessionStorage.setItem("generales_ia_examenes", JSON.stringify(examenes));
        sessionStorage.setItem("generales_ia_resumen", resumen || "");
      } catch {}
      if (avisoOkRef.current.generales) { setMostrarVistaPrevia(true); setPendingPreview(false); }
      else { setPendingPreview(true); setMostrarAviso(true); }
    } catch {
      alert("No fue posible obtener la información de IA (Generales). Intenta nuevamente.");
      setPendingPreview(false);
    }
  };

  const handleSaveComorbilidades = async (payload) => {
    setComorbilidades(payload);
    setMostrarComorbilidades(false);
    const scope = modulo === "generales" ? "generales" : "preop";
    marcarComorbilidadesOk(scope, payload);
    if (scope === "preop") await llamarPreopIA(payload);
    else await llamarGeneralesIA(payload);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    if (saved) { try { setDatosPaciente(JSON.parse(saved)); } catch {} }

    const moduloSS = sessionStorage.getItem("modulo");
    if (["trauma","preop","generales","ia"].includes(moduloSS)) setModulo(moduloSS);

    const vistaSS = sessionStorage.getItem("vistaEsquema");
    if (vistaSS === "anterior" || vistaSS === "posterior") setVista(vistaSS);

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPagoURL = params.get("idPago");
    const idPagoSS = sessionStorage.getItem("idPago");
    const idFinal = idPagoURL || idPagoSS || "";

    if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; }

    if (pago === "ok" && idFinal) {
      sessionStorage.setItem("idPago", idFinal);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try { await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`); } catch {}
        if (intentos >= 30) { clearInterval(pollerRef.current); pollerRef.current = null; }
      }, 2000);
    } else if (!pago && idFinal) {
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
    } else if (pago === "ok" && !idFinal) {
      alert("No recibimos idPago en el retorno. Intenta nuevamente.");
    } else if (pago === "cancelado") {
      alert("Pago cancelado.");
      setMostrarVistaPrevia(false);
      setPagoRealizado(false);
    }

    return () => { if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; } };
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem("vistaEsquema", vista); } catch {}
  }, [vista]);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => {
      const next = { ...prev, [campo]: valor };
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const onSeleccionZona = (zona) => {
    let dolor = ""; let lado = "";
    const z = String(zona || ""); const zl = z.toLowerCase();
    if (zl.includes("columna cervical")) { dolor = "Columna cervical"; lado = ""; }
    else if (zl.includes("columna dorsal")) { dolor = "Columna dorsal"; lado = ""; }
    else if (zl.includes("columna lumbar") || zl.includes("columna")) { dolor = "Columna lumbar"; lado = ""; }
    else if (zl.includes("cadera")) { dolor = "Cadera"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("rodilla")) { dolor = "Rodilla"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("hombro")) { dolor = "Hombro"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("codo")) { dolor = "Codo"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("mano")) { dolor = "Mano"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("tobillo")) { dolor = "Tobillo"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }

    setDatosPaciente((prev) => {
      const next = { ...prev, dolor, lado };
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
      return next;
    });

    const key = resolveZonaKey(dolor);
    if ((modulo === "trauma" || modulo === "ia") && key && hasMapper(key)) {
      setMapperId(key);
      setMostrarMapper(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const edadNum = Number(datosPaciente.edad);
    if (!datosPaciente.nombre?.trim() || !datosPaciente.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0) {
      alert("Por favor complete nombre, RUT y edad (>0).");
      return;
    }
    if (modulo === "trauma" && !datosPaciente.dolor?.trim()) {
      alert("Seleccione dolor/zona en el esquema para continuar.");
      return;
    }
    if (modulo === "preop" || modulo === "generales") {
      const scope = modulo;
      if (!comorbOkRef.current[scope]) setMostrarComorbilidades(true);
      else { if (scope === "preop") await llamarPreopIA(); else await llamarGeneralesIA(); }
      return;
    }
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setPendingPreview(false);
  };

  const handleReiniciar = async () => {
    const ok = window.confirm("Esto reiniciará completamente la aplicación (datos, estados, caches). ¿Continuar?");
    if (!ok) return;
    try { if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; } } catch {}
    try { const maxId = setTimeout(() => {}, 0); for (let i = 0; i <= maxId; i++) { clearTimeout(i); clearInterval(i); } } catch {}
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}
    try { if ("caches" in window) { const names = await caches.keys(); await Promise.all(names.map((n) => caches.delete(n))); } } catch {}
    try { if ("serviceWorker" in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); } } catch {}
    try { const url = new URL(window.location.href); url.search = ""; url.hash = ""; window.history.replaceState(null, "", url.toString()); window.location.replace(url.toString()); }
    catch { window.location.reload(); }
  };

  const resetPreviewOnModuleChange = (nextKey) => {
    try { if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; } } catch {}
    setMostrarVistaPrevia(false);
    setPagoRealizado(false);
    setPendingPreview(false);
    setShowReso(false);
    setResolverReso(null);
    setMostrarMapper(false);
    setMostrarComorbilidades(false);
    setRmPdfListo(false);
    setRmIdPago("");
    try {
      [
        "preop_ia_examenes","preop_ia_resumen",
        "generales_ia_examenes","generales_ia_resumen",
        "solicitaResonancia","rm_pdf_disponible","rm_idPago",
      ].forEach((k) => sessionStorage.removeItem(k));
    } catch {}
    try { const url = new URL(window.location.href); if (url.search) { url.search = ""; window.history.replaceState(null, "", url.toString()); } } catch {}
  };

  /* ========= NUEVO: Integración PantallaDos (sin overlays) ========= */
  const [mostrarPantallaDos, setMostrarPantallaDos] = useState(false);

  const abrirPantallaDos = () => {
    // Apaga TODOS los overlays/modales antes de entrar para no bloquear clics
    setMostrarAviso(false);
    setPendingPreview(false);
    setShowReso(false);
    setResolverReso(null);
    setMostrarMapper(false);
    setMostrarComorbilidades(false);
    // Renderiza PantallaDos exclusiva
    setMostrarPantallaDos(true);
  };

  const salirPantallaDos = () => {
    setMostrarPantallaDos(false);
  };

  /* ================== RENDER ================== */
  if (mostrarPantallaDos) {
    // Modo PantallaDos: NO renders de overlays ni del layout principal
    return (
      <div className="app" style={cssVars}>
        <PantallaDos onVolver={salirPantallaDos} />
      </div>
    );
  }

  return (
    <div className="app" style={cssVars}>
      {/* Top bar */}
      <div style={styles.topBarWrap}>
        <div style={styles.topBar}>
          {[ // 4 módulos nativos
            { key: "trauma", label: "ASISTENTE TRAUMATOLÓGICO" },
            { key: "preop", label: "EXÁMENES PREQUIRÚRGICOS" },
            { key: "generales", label: "REVISIÓN GENERAL" },
            { key: "ia", label: "ANÁLISIS MEDIANTE IA" },
          ].map((b) => {
            const active = modulo === b.key;
            const styleBtn = { ...styles.topBtn, ...(active ? styles.topBtnActive : styles.topBtnIdle) };
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => {
                  if (modulo !== b.key) resetPreviewOnModuleChange(b.key);
                  setModulo(b.key);
                  try { sessionStorage.setItem("modulo", b.key); } catch {}
                  setPendingPreview(false);
                  if ((b.key === "preop" || b.key === "generales") && !avisoOkRef.current[b.key]) {
                    setMostrarAviso(true);
                  }
                }}
                className="btn"
                style={styleBtn}
              >
                {b.label}
              </button>
            );
          })}

          {/* NUEVO: botón MÓDULOS para abrir PantallaDos */}
          <button
            type="button"
            onClick={abrirPantallaDos}
            className="btn secondary"
            style={{ ...styles.topBtn, ...styles.topBtnIdle }}
            aria-label="Abrir selección de módulos"
          >
            MÓDULOS
          </button>

          {/* Reiniciar */}
          <button
            type="button"
            onClick={handleReiniciar}
            aria-label="Reiniciar asistente"
            className="btn secondary"
            style={{ ...styles.topBtn, ...styles.topBtnIdle }}
          >
            REINICIAR
          </button>
        </div>
      </div>

      {/* Aviso Legal (solo cuando NO estamos en PantallaDos) */}
      <AvisoLegal visible={mostrarAviso} persist={false} onAccept={continuarTrasAviso} onReject={rechazarAviso} />

      {/* Layout principal */}
      <div className="row" style={styles.contentRow}>
        {/* Columna 1 - Esquema */}
        <div className="col" style={styles.esquemaCol}>
          <div className="card">
            <EsquemaToggleTabs vista={vista} onChange={setVista} />
            {vista === "anterior" ? (
              <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
            ) : (
              <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />
            )}

            <div aria-live="polite" role="status" style={styles.statusBox}>
              {datosPaciente?.dolor ? (
                <>
                  Zona seleccionada:{" "}
                  <strong>
                    {datosPaciente.dolor}
                    {datosPaciente.lado ? ` — ${datosPaciente.lado}` : ""}
                  </strong>
                  {hasMapper(resolveZonaKey(datosPaciente?.dolor)) &&
                    (modulo === "trauma" || modulo === "ia") && (
                      <button
                        type="button"
                        onClick={() => {
                          const k = resolveZonaKey(datosPaciente?.dolor);
                          if (k && hasMapper(k)) {
                            setMapperId(k);
                            setMostrarMapper(true);
                          }
                        }}
                        className="btn ghost"
                        style={{ marginLeft: 8 }}
                      >
                        Marcar puntos
                      </button>
                    )}
                </>
              ) : (
                "Seleccione una zona en el esquema"
              )}
            </div>
          </div>
        </div>

        {/* Columna 2 - Formulario Paciente */}
        <div className="col" style={styles.formCol}>
          <div className="card">
            <FormularioPaciente
              datos={datosPaciente}
              onCambiarDato={handleCambiarDato}
              onSubmit={handleSubmit}
              moduloActual={modulo}
            />
          </div>
        </div>

        {/* Columna 3 - Módulos / Preview */}
        <div className="col" style={styles.previewCol} data-preview-col>
          <div className="card">
            {mostrarVistaPrevia && modulo === "trauma" && (
              <TraumaModulo
                initialDatos={datosPaciente}
                onPedirChecklistResonancia={pedirChecklistResonancia}
                onDetectarResonancia={detectarResonanciaEnBackend}
                resumenResoTexto={resumenResoTexto}
              />
            )}

            {mostrarVistaPrevia && modulo === "preop" && (
              <PreopModulo initialDatos={datosPaciente} />
            )}

            {mostrarVistaPrevia && modulo === "generales" && (
              <GeneralesModulo initialDatos={datosPaciente} />
            )}

            {mostrarVistaPrevia && modulo === "ia" && (
              <IAModulo
                key={`ia-${modulo}`}
                initialDatos={datosPaciente}
                pedirChecklistResonancia={pedirChecklistResonancia}
              />
            )}

            {mostrarVistaPrevia && (modulo === "trauma" || modulo === "ia") && rmPdfListo && !!rmIdPago && (
              <div style={{ marginTop: 8 }}>
                <a
                  href={`${BACKEND_BASE}/pdf-rm/${rmIdPago}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: "inline-block",
                    fontWeight: 750,
                    fontSize: 13,
                    textDecoration: "none",
                    background: T?.surface,
                    color: T?.primaryDark || "#0d47a1",
                    border: `2px solid ${T?.primaryDark || "#0d47a1"}`,
                  }}
                >
                  Formulario RM (PDF)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==== Modales/overlays (solo cuando NO estamos en PantallaDos) ==== */}
      {showReso && (
        <div className="overlay show" style={styles.modalOverlay}>
          <div className="card" style={{ width: "min(900px, 96vw)" }}>
            <FormularioResonancia
              onCancel={() => { setShowReso(false); resolverReso?.({ canceled: true }); }}
              onSave={async (data, { riesgos, observaciones }) => {
                setShowReso(false);
                try {
                  const idPago = sessionStorage.getItem("idPago") || "";
                  if (idPago) {
                    await fetch(`${BACKEND_BASE}/guardar-rm`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        idPago,
                        rmForm: data,
                        observaciones: typeof observaciones === "string"
                          ? observaciones
                          : Array.isArray(riesgos) ? riesgos.join(", ") : "",
                      }),
                    });
                    setRmPdfListo(true);
                    setRmIdPago(idPago);
                    sessionStorage.setItem("rm_pdf_disponible", "1");
                    sessionStorage.setItem("rm_idPago", idPago);
                  }
                } catch {}
                const resumen = resumenResoTexto(data);
                const bloquea = hasRedFlags(data);
                resolverReso?.({ canceled: false, bloquea, data, riesgos, resumen });
              }}
            />
          </div>
        </div>
      )}

      {(modulo === "trauma" || modulo === "ia") && mostrarMapper && (
        <div className="overlay show" style={styles.modalOverlay}>
          <div className="card" style={{ width: "min(900px, 96vw)" }}>
            <GenericMapper
              mapperId={mapperId}
              ladoInicial={(datosPaciente?.lado || "").toLowerCase().includes("izq") ? "izquierda" : "derecha"}
              vistaInicial={mapperId === "mano" ? (vista === "anterior" ? "palmar" : "dorsal") : vista}
              onSave={() => setMostrarMapper(false)}
              onClose={() => setMostrarMapper(false)}
            />
          </div>
        </div>
      )}

      {mostrarComorbilidades && (
        <div className="overlay show" style={styles.modalOverlay}>
          <div className="card" style={{ width: "min(900px, 96vw)" }}>
            <FormularioComorbilidades
              initial={comorbilidades || {}}
              onSave={handleSaveComorbilidades}
              onCancel={() => setMostrarComorbilidades(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Styles ===== */
const styles = {
  topBarWrap: {
    position: "sticky", top: 0, zIndex: 50,
    background: T.headerBg || T.bg,
    borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: T.headerBorder ?? T.border,
    boxShadow: T.headerShadow ?? T.shadowSm,
  },
  topBar: {
    maxWidth: 1200, margin: "0 auto", padding: "12px 16px",
    display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, // 4 módulos + MÓDULOS + Reiniciar
  },
  topBtn: {
    borderRadius: 10, padding: "12px 14px", fontSize: 14, fontWeight: 700,
    cursor: "pointer", transition: "all .18s ease", lineHeight: 1.2, borderWidth: 2, borderStyle: "solid",
  },
  topBtnActive: {
    backgroundColor: T.primary, color: T.onPrimary, borderColor: T.primaryDark,
    boxShadow: `0 0 0 3px ${T.accentAlpha}, ${T.shadowMd}`, transform: "translateY(-1px)",
  },
  topBtnIdle: {
    backgroundColor: T.surface, color: T.primary, borderColor: T.primary,
  },
  contentRow: { alignItems: "flex-start" },
  esquemaCol: { flex: "0 0 400px", maxWidth: 400 },
  formCol: { flex: "0 0 400px", maxWidth: 400, position: "relative", zIndex: 0 },
  previewCol: { minWidth: 360, position: "relative", zIndex: 0, overflow: "hidden" },
  statusBox: {
    marginTop: 8, fontSize: 14, color: T.textMuted, background: T.surface,
    padding: "6px 8px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: T.border, minHeight: 30,
  },
  modalOverlay: {
    position: "fixed", inset: 0, background: T.overlay,
    display: "grid", placeItems: "center", zIndex: 2147483000, padding: 12, pointerEvents: "auto",
  },
};

export default App;
