// src/App.jsx
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import "./app.css";

/* Esquema corporal */
import EsquemaAnterior from "./EsquemaAnterior.jsx";
import EsquemaPosterior from "./EsquemaPosterior.jsx";
import EsquemaToggleTabs from "./EsquemaToggleTabs.jsx";

/* Formularios y utilidades */
import FormularioPacienteBasico from "./FormularioPacienteBasico.jsx";
import FormularioTipoCirugia from "./FormularioTipoCirugia.jsx";
import AvisoLegal from "./components/AvisoLegal.jsx";
import FormularioResonancia from "./components/FormularioResonancia.jsx";
import FormularioComorbilidades from "./components/FormularioComorbilidades.jsx";

/* PREVIEW (pantalla nueva) en DOS PASOS */
import PreviewOrden from "./PreviewOrden.jsx";
import PreviewIA from "./PreviewIA.jsx";

/* Host genérico de mapeadores (rodilla, mano, etc.) */
import GenericMapper from "./mappers/GenericMapper.jsx";
import { hasMapper, resolveZonaKey } from "./mappers/mapperRegistry.js";

/* Tema (JSON + helper) */
import { getTheme } from "./theme.js";
const T = getTheme();

/* Mapea theme → variables CSS que usa app.css */
const cssVars = {
  "--bg": T.bg,
  "--surface": T.surface,
  "--border": T.border,
  "--text": T.text,
  "--text-muted": T.textMuted,
  "--muted": T.muted,
  "--primary": T.primary,
  "--primary-dark": T.primaryDark,
  "--onPrimary": T.onPrimary,
  "--accent-alpha": T.accentAlpha,
  "--shadow-sm": T.shadowSm,
  "--shadow-md": T.shadowMd,
  "--overlay": T.overlay,
};

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* Normaliza solo para el backend (UI sigue MASCULINO/FEMENINO) */
const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

function App() {
  /* ====================== ESTADO RAÍZ ====================== */
  // pasos: 'inicio' | 'paciente' | 'menu' | 'modulo' | 'preview'
  const [paso, setPaso] = useState("inicio");
  const [isGuest, setIsGuest] = useState(false);

  // módulo activo
  const [modulo, setModulo] = useState("trauma"); // 'trauma' | 'preop' | 'generales' | 'ia'

  const [datosPaciente, setDatosPaciente] = useState({
    nombre: "",
    rut: "",
    edad: "",
    genero: "",
    dolor: "",
    lado: "",
  });

  // Debounce para evitar “una letra por vez”
  const ssTimerRef = useRef(null);
  const persistDatosDebounced = useCallback((next) => {
    try {
      if (ssTimerRef.current) clearTimeout(ssTimerRef.current);
      ssTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
        } catch {}
      }, 180);
    } catch {}
  }, []);

  // Preview en dos pasos: 'orden' → 'ia'
  const [previewStep, setPreviewStep] = useState("orden");
  const [loadingIA, setLoadingIA] = useState(false);
  const pendingNextRef = useRef(null); // acción pendiente tras Aviso/Comorbilidades

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const pollerRef = useRef(null);

  // Vista esquema (frontal/posterior)
  const [vista, setVista] = useState("anterior");

  // Modal genérico de mapeadores (rodilla, mano, etc.)
  const [mostrarMapper, setMostrarMapper] = useState(false);
  const [mapperId, setMapperId] = useState(null);

  // === RM (PDF listo tras guardar el formulario) ===
  const [rmPdfListo, setRmPdfListo] = useState(() => {
    try {
      return sessionStorage.getItem("rm_pdf_disponible") === "1";
    } catch {
      return false;
    }
  });
  const [rmIdPago, setRmIdPago] = useState(() => {
    try {
      return sessionStorage.getItem("rm_idPago") || "";
    } catch {
      return "";
    }
  });

  // ====== Flags persistentes (por módulo: preop / generales) ======
  const avisoOkRef = useRef({ preop: false, generales: false });
  const comorbOkRef = useRef({ preop: false, generales: false });

  const getComorbStorageKey = (scope) =>
    scope === "generales" ? "generales_comorbilidades_data" : "preop_comorbilidades_data";
  const getAvisoKey = (scope) =>
    scope === "generales" ? "generales_aviso_ok" : "preop_aviso_ok";
  const getComorbOkKey = (scope) =>
    scope === "generales" ? "generales_comorbilidades_ok" : "preop_comorbilidades_ok";

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
    try {
      sessionStorage.setItem(getAvisoKey(scope), "1");
    } catch {}
  };

  const marcarComorbilidadesOk = (scope, payload) => {
    comorbOkRef.current[scope] = true;
    try {
      sessionStorage.setItem(getComorbOkKey(scope), "1");
      sessionStorage.setItem(getComorbStorageKey(scope), JSON.stringify(payload || {}));
    } catch {}
  };

  // ====== Aviso Legal ======
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const continuarTrasAviso = async () => {
    setMostrarAviso(false);
    if (modulo === "preop" || modulo === "generales") marcarAvisoOk(modulo);
    // Ejecuta acción pendiente (por ejemplo, llamar IA y pasar a 'ia')
    if (typeof pendingNextRef.current === "function") {
      const fn = pendingNextRef.current;
      pendingNextRef.current = null;
      await fn();
    }
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    try {
      window.close();
    } catch {}
    setTimeout(() => {
      if (!window.closed) window.location.href = "about:blank";
    }, 0);
  };

  // ====== RNM (checklist) compartido ======
  const [showReso, setShowReso] = useState(false);
  const [resolverReso, setResolverReso] = useState(null);
  const RED_FLAGS = new Set([
    "marcapasos",
    "coclear_o_neuro",
    "clips_aneurisma",
    "valvula_cardiaca_metal",
    "fragmentos_metalicos",
  ]);
  const pedirChecklistResonancia = () =>
    new Promise((resolve) => {
      setResolverReso(() => resolve);
      setShowReso(true);
    });
  const hasRedFlags = (data) =>
    Object.entries(data || {}).some(([k, v]) => RED_FLAGS.has(k) && v === true);
  const resumenResoTexto = (data) => {
    const si =
      Object.entries(data || {})
        .filter(([_, v]) => v === true)
        .map(([k]) => k)
        .join(", ") || "—";
    const no =
      Object.entries(data || {})
        .filter(([_, v]) => v === false)
        .map(([k]) => k)
        .join(", ") || "—";
    return [
      "FORMULARIO DE SEGURIDAD PARA RESONANCIA MAGNÉTICA",
      `Sí: ${si}`,
      `No: ${no}`,
      "Declaro que la información es veraz y autorizo la realización del examen.",
      "Firma Paciente: ______________________     RUT: _______________     Fecha: ____/____/______",
    ].join("\n");
  };

  // Utilidades expuestas
  const esResonanciaTexto = (t = "") => {
    const s = (t || "").toLowerCase();
    return s.includes("resonancia") || s.includes("resonancia magn") || /\brm\b/i.test(t);
  };
  const detectarResonanciaEnBackend = async (datos) => {
    try {
      const r = await fetch(`${BACKEND_BASE}/detectar-resonancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datosPaciente: datos }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const flag =
        typeof j?.resonancia === "boolean"
          ? j.resonancia
          : esResonanciaTexto(j?.texto || j?.orden || "");
      sessionStorage.setItem("solicitaResonancia", flag ? "1" : "0");
      return !!flag;
    } catch {
      sessionStorage.setItem("solicitaResonancia", "0");
      return false;
    }
  };

  // ====== Comorbilidades (modal) ======
  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);
  const [comorbilidades, setComorbilidades] = useState(() => {
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey("preop"));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Mantener comorbilidades al cambiar de módulo
  useEffect(() => {
    if (modulo !== "preop" && modulo !== "generales") return;
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey(modulo));
      setComorbilidades(raw ? JSON.parse(raw) : null);
    } catch {
      setComorbilidades(null);
    }
  }, [modulo]);

  // ====== LLAMADAS IA (sin UI, solo setean sessionStorage) ======
  const llamarPreopIA = async (payloadComorb) => {
    let idPago = "";
    try {
      idPago = sessionStorage.getItem("idPago") || "";
      if (!idPago) {
        idPago = `preop_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
        sessionStorage.setItem("idPago", idPago);
      }
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
    const paciente = {
      ...datosPaciente,
      edad: edadNum,
      genero: normalizarGenero(datosPaciente.genero),
    };

    const resp = await fetch(`${BACKEND_BASE}/preop-ia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, paciente, comorbilidades: comorb || {}, tipoCirugia }),
    }).catch(() => null);

    let okResp = resp?.ok;
    let j = null;
    if (!okResp) {
      const r2 = await fetch(`${BACKEND_BASE}/ia-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, paciente, comorbilidades: comorb || {}, tipoCirugia }),
      }).catch(() => null);
      okResp = !!r2?.ok;
      j = okResp ? await r2.json() : null;
    } else {
      j = await resp.json();
    }
    if (!okResp) return false;

    const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
    const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";
    try {
      sessionStorage.setItem("preop_ia_examenes", JSON.stringify(examenes));
      sessionStorage.setItem("preop_ia_resumen", resumen || "");
    } catch {}
    return true;
  };

  const llamarGeneralesIA = async (payloadComorb) => {
    let idPago = "";
    try {
      idPago = sessionStorage.getItem("idPago") || "";
      if (!idPago) {
        idPago = `generales_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
        sessionStorage.setItem("idPago", idPago);
      }
    } catch {}

    let comorb = payloadComorb || comorbilidades;
    if (!comorb) {
      try {
        const raw = sessionStorage.getItem(getComorbStorageKey("generales"));
        if (raw) comorb = JSON.parse(raw);
      } catch {}
    }

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = {
      ...datosPaciente,
      edad: edadNum,
      genero: normalizarGenero(datosPaciente.genero),
    };

    // Ruta específica
    let resp = await fetch(`${BACKEND_BASE}/ia-generales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, paciente, comorbilidades: comorb || {} }),
    }).catch(() => null);

    let okResp = !!resp?.ok;
    let j = okResp ? await resp.json() : null;

    // Fallbacks
    if (!okResp) {
      resp = await fetch(`${BACKEND_BASE}/preop-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, paciente, comorbilidades: comorb || {}, tipoCirugia: "" }),
      }).catch(() => null);
      okResp = !!resp?.ok;
      j = okResp ? await resp.json() : null;
    }
    if (!okResp) {
      resp = await fetch(`${BACKEND_BASE}/ia-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, paciente, comorbilidades: comorb || {}, tipoCirugia: "" }),
      }).catch(() => null);
      okResp = !!resp?.ok;
      j = okResp ? await resp.json() : null;
    }
    if (!okResp) return false;

    const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
    const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";
    try {
      sessionStorage.setItem("generales_ia_examenes", JSON.stringify(examenes));
      sessionStorage.setItem("generales_ia_resumen", resumen || "");
    } catch {}
    return true;
  };

  // Guardar comorbilidades → marcar ok → continuar acción pendiente si existía
  const handleSaveComorbilidades = async (payload) => {
    setComorbilidades(payload);
    setMostrarComorbilidades(false);
    const scope = modulo === "generales" ? "generales" : "preop";
    marcarComorbilidadesOk(scope, payload);
    if (typeof pendingNextRef.current === "function") {
      const fn = pendingNextRef.current;
      pendingNextRef.current = null;
      await fn();
    }
  };

  /* ====== Restauración de estado útil ====== */
  useEffect(() => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    if (saved) {
      try {
        setDatosPaciente(JSON.parse(saved));
      } catch {}
    }

    const vistaSS = sessionStorage.getItem("vistaEsquema");
    if (vistaSS === "anterior" || vistaSS === "posterior") setVista(vistaSS);

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPagoURL = params.get("idPago");
    const idPagoSS = sessionStorage.getItem("idPago");
    const idFinal = idPagoURL || idPagoSS || "";

    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (pago === "ok" && idFinal) {
      sessionStorage.setItem("idPago", idFinal);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
      setPaso("preview");
      setPreviewStep("orden");
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`);
        } catch {}
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }, 2000);
    } else if (!pago && idFinal) {
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
      setPaso("preview");
      setPreviewStep("orden");
    } else if (pago === "ok" && !idFinal) {
      alert("No recibimos idPago en el retorno. Intenta nuevamente.");
    } else if (pago === "cancelado") {
      alert("Pago cancelado.");
      setMostrarVistaPrevia(false);
      setPagoRealizado(false);
    }
  }, []);

  // Persistir vista de esquema
  useEffect(() => {
    try {
      sessionStorage.setItem("vistaEsquema", vista);
    } catch {}
  }, [vista]);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => {
      const next = { ...prev, [campo]: valor };
      persistDatosDebounced(next);
      return next;
    });
  };

  // ====== Selección de zona (sin submódulos en Preop/Generales) ======
  const onSeleccionZona = (zona) => {
    let dolor = "";
    let lado = "";
    const z = String(zona || "");
    const zl = z.toLowerCase();

    if (zl.includes("columna cervical")) {
      dolor = "Columna cervical";
      lado = "";
    } else if (zl.includes("columna dorsal")) {
      dolor = "Columna dorsal";
      lado = "";
    } else if (zl.includes("columna lumbar") || zl.includes("columna")) {
      dolor = "Columna lumbar";
      lado = "";
    } else if (zl.includes("cadera")) {
      dolor = "Cadera";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("rodilla")) {
      dolor = "Rodilla";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("hombro")) {
      dolor = "Hombro";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("codo")) {
      dolor = "Codo";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("mano")) {
      dolor = "Mano";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("tobillo")) {
      dolor = "Tobillo";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    }

    setDatosPaciente((prev) => {
      const next = { ...prev, dolor, lado };
      persistDatosDebounced(next);
      return next;
    });

    // Solo Trauma/IA permiten abrir mapper
    const key = resolveZonaKey(dolor);
    if ((modulo === "trauma" || modulo === "ia") && key && hasMapper(key)) {
      setMapperId(key);
      setMostrarMapper(true);
    }
  };

  // Helper: validar tipo de cirugía (Preop)
  const validarTipoCirugiaPreop = () => {
    try {
      const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
      const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      const elegido = fijo || otro || "";
      if (!elegido) return { ok: false, msg: "Seleccione el TIPO DE CIRUGÍA." };
      if (fijo === "OTRO (ESPECIFICAR)" && !otro.trim()) {
        return { ok: false, msg: "Especifique el tipo de cirugía en el campo 'Otro'." };
      }
      return { ok: true };
    } catch {
      return { ok: false, msg: "Seleccione el TIPO DE CIRUGÍA." };
    }
  };

  // ====== Submit del módulo → ir a PREVIEW (paso ORDEN) ======
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!isGuest) {
      const edadNum = Number(datosPaciente.edad);
      if (
        !datosPaciente.nombre?.trim() ||
        !datosPaciente.rut?.trim() ||
        !Number.isFinite(edadNum) ||
        edadNum <= 0
      ) {
        alert("Por favor complete nombre, RUT y edad (>0).");
        setPaso("paciente");
        return;
      }
    }

    if ((modulo === "trauma" || modulo === "ia") && !datosPaciente.dolor?.trim()) {
      alert("Seleccione dolor/zona en el esquema para continuar.");
      return;
    }

    if (modulo === "preop") {
      const v = validarTipoCirugiaPreop();
      if (!v.ok) {
        alert(v.msg);
        return;
      }
    }

    // Ir a pantalla de preview (paso ORDEN)
    setMostrarVistaPrevia(true);
    setPaso("preview");
    setPreviewStep("orden");
  };

  /* ====== Botón REINICIAR ====== */
  const handleReiniciar = async () => {
    const ok = window.confirm(
      "Esto reiniciará completamente la aplicación (datos, estados, caches). ¿Continuar?"
    );
    if (!ok) return;

    try {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    } catch {}

    try {
      const maxId = setTimeout(() => {}, 0);
      for (let i = 0; i <= maxId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}
    try {
      localStorage.clear();
    } catch {}

    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {}

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}

    let cleanUrl = window.location.href;
    try {
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      cleanUrl = url.toString();
      window.history.replaceState(null, "", cleanUrl);
    } catch {}

    try {
      window.location.replace(cleanUrl);
    } catch {
      window.location.reload();
    }
  };

  /* ====== Reset al entrar a un módulo ====== */
  const resetPreviewForModule = () => {
    try {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    } catch {}

    setMostrarVistaPrevia(false);
    setPagoRealizado(false);
    setShowReso(false);
    setResolverReso(null);
    setMostrarMapper(false);
    setMostrarComorbilidades(false);
    setRmPdfListo(false);
    setRmIdPago("");
    setPreviewStep("orden");
    pendingNextRef.current = null;

    try {
      [
        "preop_ia_examenes",
        "preop_ia_resumen",
        "generales_ia_examenes",
        "generales_ia_resumen",
        "solicitaResonancia",
        "rm_pdf_disponible",
        "rm_idPago",
      ].forEach((k) => sessionStorage.removeItem(k));
    } catch {}

    try {
      const url = new URL(window.location.href);
      if (url.search) {
        url.search = "";
        window.history.replaceState(null, "", url.toString());
      }
    } catch {}
  };

  /* ============ LÓGICA del botón CONTINUAR en PREVIEW (Orden → IA) ============ */
  const runIASequence = async () => {
    // Si faltan comorbilidades en preop/generales, abrir modal y reintentar al guardar
    if ((modulo === "preop" || modulo === "generales") && !comorbOkRef.current[modulo]) {
      pendingNextRef.current = async () => {
        await runIASequence();
      };
      setMostrarComorbilidades(true);
      return;
    }

    setLoadingIA(true);
    let ok = true;
    if (modulo === "preop") ok = await llamarPreopIA();
    else if (modulo === "generales") ok = await llamarGeneralesIA();
    // trauma/ia no requieren llamada para mostrar PreviewIA (si tu PreviewIA usa backend en estos, adapta aquí)
    setLoadingIA(false);

    if (!ok && (modulo === "preop" || modulo === "generales")) {
      alert("No fue posible obtener la información de IA. Intenta nuevamente.");
      return;
    }
    setPreviewStep("ia");
  };

  const handlePreviewContinuar = async () => {
    if (modulo === "preop" || modulo === "generales") {
      // Aviso legal requerido antes de llamar IA
      if (!avisoOkRef.current[modulo]) {
        pendingNextRef.current = async () => {
          await runIASequence();
        };
        setMostrarAviso(true);
        return;
      }
      await runIASequence();
    } else {
      // trauma / ia: pasar directo a 'ia'
      setPreviewStep("ia");
    }
  };

  /* ============================ UI POR PASOS ============================ */
  const PantallaInicio = () => (
    <div className="card" style={styles.centerCard}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Asistente Virtual para Pacientes</h1>
        <p style={{ margin: 0, color: T.textMuted }}>icaricular.cl</p>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <button
          className="btn"
          onClick={() => {
            setIsGuest(false);
            try {
              sessionStorage.setItem("guest", "0");
            } catch {}
            setPaso("paciente");
          }}
        >
          Ingresar Paciente
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            setIsGuest(true);
            try {
              sessionStorage.setItem("guest", "1");
            } catch {}
            setPaso("menu");
          }}
          title="Modo prueba (permite navegar y generar documentos)"
        >
          Guest
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={handleReiniciar}>
          Reiniciar
        </button>
      </div>
    </div>
  );

  const PantallaPaciente = () => (
    <div className="card" style={styles.centerCard}>
      <h2 style={{ marginTop: 0 }}>Datos del Paciente</h2>
      <FormularioPacienteBasico
        datos={datosPaciente}
        onCambiarDato={handleCambiarDato}
        onSubmit={(e) => {
          e.preventDefault();
          setPaso("menu");
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn ghost" onClick={() => setPaso("inicio")}>
          Volver
        </button>
        <button
          className="btn"
          onClick={() => setPaso("menu")}
          style={{ marginLeft: "auto" }}
        >
          Continuar
        </button>
      </div>
    </div>
  );

  const BotonModulo = ({ onClick, children }) => (
    <button className="btn" style={styles.menuBtn} onClick={onClick}>
      {children}
    </button>
  );

  const PantallaMenu = () => (
    <div className="card" style={styles.centerCard}>
      <h2 style={{ marginTop: 0, textAlign: "center" }}>Menú</h2>
      <div style={styles.menuGrid}>
        <BotonModulo
          onClick={() => {
            resetPreviewForModule();
            setModulo("trauma");
            setPaso("modulo");
          }}
        >
          TraumaIA
        </BotonModulo>
        <BotonModulo
          onClick={() => {
            resetPreviewForModule();
            setModulo("ia");
            setPaso("modulo");
          }}
        >
          ANÁLISIS MEDIANTE IA
        </BotonModulo>

        <BotonModulo
          onClick={() => {
            resetPreviewForModule();
            setModulo("preop");
            setPaso("modulo");
            // El aviso se mostrará cuando se presione "Continuar" en PreviewOrden
          }}
        >
          Preoperatorio
        </BotonModulo>
        <BotonModulo
          onClick={() => {
            resetPreviewForModule();
            setModulo("generales");
            setPaso("modulo");
          }}
        >
          Generales
        </BotonModulo>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={() => setPaso(isGuest ? "inicio" : "paciente")}>
          Volver
        </button>
      </div>
    </div>
  );

  // En módulos: SOLO esquema humano; en PREOP se muestra Tipo de Cirugía
  const PantallaModulo = () => (
    <>
      <div className="row" style={styles.contentRow}>
        <div className="col" style={{ ...styles.esquemaCol, maxWidth: 520, width: "100%" }}>
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

            {modulo === "preop" && (
              <div style={{ marginTop: 12 }}>
                <FormularioTipoCirugia datos={datosPaciente} onTipoCirugiaChange={() => {}} />
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setPaso("menu")}>
                Volver al Menú
              </button>
              <button className="btn" style={{ marginLeft: "auto" }} onClick={handleSubmit}>
                Generar vista previa
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Pantalla de PREVIEW (pantalla nueva) en dos pasos
  const PantallaPreview = () => (
    <div className="row" style={{ marginTop: 12 }}>
      <div className="col" style={{ width: "min(980px, 96vw)", margin: "0 auto" }}>
        <div className="card">
          {previewStep === "orden" && (
            <>
              <PreviewOrden
                initialDatos={datosPaciente}
                onPedirChecklistResonancia={pedirChecklistResonancia}
                onDetectarResonancia={detectarResonanciaEnBackend}
                resumenResoTexto={resumenResoTexto}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn ghost" onClick={() => setPaso("modulo")}>
                  Volver
                </button>
                <button className="btn" style={{ marginLeft: "auto" }} onClick={handlePreviewContinuar}>
                  {modulo === "preop" || modulo === "generales" ? "Continuar y generar IA" : "Continuar"}
                </button>
              </div>
            </>
          )}

          {previewStep === "ia" && (
            <>
              <PreviewIA initialDatos={datosPaciente} pedirChecklistResonancia={pedirChecklistResonancia} />
              {/* Botón Formulario RM (PDF) pensado para Trauma/IA */}
              {(modulo === "trauma" || modulo === "ia") && rmPdfListo && !!rmIdPago && (
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

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn ghost" onClick={() => setPaso("menu")}>
                  Volver al Menú
                </button>
                <button
                  className="btn"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    setPreviewStep("orden");
                  }}
                >
                  Volver al resumen
                </button>
              </div>
            </>
          )}

          {loadingIA && (
            <div style={{ marginTop: 10, fontSize: 14, color: T.textMuted }}>
              Generando informe con IA…
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ================== Render raíz por paso ================== */
  return (
    <div className="app" style={cssVars}>
      {/* Overlays globales */}
      <AvisoLegal
        visible={mostrarAviso}
        persist={false}
        onAccept={continuarTrasAviso}
        onReject={rechazarAviso}
      />

      {/* Modal RNM */}
      {showReso && (
        <div className="overlay show" style={styles.modalOverlay}>
          <div className="card" style={{ width: "min(900px, 96vw)" }}>
            <FormularioResonancia
              onCancel={() => {
                setShowReso(false);
                resolverReso?.({ canceled: true });
              }}
              onSave={async (data, { riesgos, observaciones }) => {
                setShowReso(false);
                // Guardar respuestas en backend y habilitar botón PDF
                try {
                  const idPago = sessionStorage.getItem("idPago") || "";
                  if (idPago) {
                    await fetch(`${BACKEND_BASE}/guardar-rm`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        idPago,
                        rmForm: data,
                        observaciones:
                          typeof observaciones === "string"
                            ? observaciones
                            : Array.isArray(riesgos)
                            ? riesgos.join(", ")
                            : "",
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

      {/* Modal Genérico de Mapeo (PNG+SVG) */}
      {(modulo === "trauma" || modulo === "ia") && mostrarMapper && (
        <div className="overlay show" style={styles.modalOverlay}>
          <div className="card" style={{ width: "min(900px, 96vw)" }}>
            <GenericMapper
              mapperId={mapperId}
              ladoInicial={(datosPaciente?.lado || "")
                .toLowerCase()
                .includes("izq")
                ? "izquierda"
                : "derecha"}
              vistaInicial={mapperId === "mano" ? (vista === "anterior" ? "palmar" : "dorsal") : vista}
              onSave={() => setMostrarMapper(false)}
              onClose={() => setMostrarMapper(false)}
            />
          </div>
        </div>
      )}

      {/* Modal Comorbilidades */}
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

      {/* Contenido por pasos */}
      {paso === "inicio" && <PantallaInicio />}
      {paso === "paciente" && <PantallaPaciente />}
      {paso === "menu" && <PantallaMenu />}
      {paso === "modulo" && <PantallaModulo />}
      {paso === "preview" && <PantallaPreview />}
    </div>
  );
}

/* ================== Styles (solo variables del theme.json) ================== */
const styles = {
  centerCard: { maxWidth: 520, margin: "24px auto", padding: 16 },
  menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  menuBtn: { padding: "22px 12px", fontSize: 16, fontWeight: 800 },
  contentRow: { alignItems: "flex-start", marginTop: 12 },
  esquemaCol: { flex: "0 0 400px", maxWidth: 400 },
  statusBox: {
    marginTop: 8,
    fontSize: 14,
    color: T.textMuted,
    background: T.surface,
    padding: "6px 8px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: T.border,
    minHeight: 30,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: T.overlay,
    display: "grid",
    placeItems: "center",
    zIndex: 2147483000,
    padding: 12,
    pointerEvents: "auto",
  },
};

export default App;
