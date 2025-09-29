// src/modules/PreopModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import "./PreopModulo.css"; // ← NUEVO: estilos movidos a CSS

const T = getTheme();
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* Etiquetas amigables para chips de comorbilidades */
const LABELS_COMORB = {
  hta: "Hipertensión arterial",
  dm2: "Diabetes mellitus tipo 2",
  dislipidemia: "Dislipidemia",
  obesidad: "Obesidad",
  tabaquismo: "Tabaco",
  epoc_asma: "EPOC / Asma",
  cardiopatia: "Cardiopatía",
  erc: "Enfermedad renal crónica",
  hipotiroidismo: "Hipotiroidismo",
  anticoagulantes: "Anticoagulantes/antiagregantes",
  artritis_reumatoide: "Artritis reumatoide / autoinmune",
  alergias_flag: "Alergias",
  alergias_detalle: "Alergias (detalle)",
  otras: "Otros",
  anticoagulantes_detalle: "Detalle anticoagulantes",
};

function prettyComorb(c = {}) {
  try {
    const keys = Object.keys(c);
    if (!keys.length) return [];
    const out = [];
    for (const k of keys) {
      const v = c[k];
      const label = LABELS_COMORB[k] || k.replace(/_/g, " ");
      if (typeof v === "boolean") {
        if (v) out.push(label);
        continue;
      }
      if (typeof v === "object" && v !== null && (v.tiene || v.usa || v.detalle)) {
        let t = label;
        if (v.detalle) t += ` — ${v.detalle}`;
        out.push(t);
        continue;
      }
      if (typeof v === "string" && v.trim()) {
        out.push(`${label}: ${v.trim()}`);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/* ===== Helper para el resumen inicial PREOP (sin cambiar tus variables) ===== */
function generoPalabra(genero = "") {
  const s = String(genero).toUpperCase();
  if (s === "MASCULINO") return "Hombre";
  if (s === "FEMENINO") return "Mujer";
  return "Paciente";
}
function resumenInicialPreop({ datos = {}, comorb = {}, tipoCirugia = "" }) {
  const sujeto = generoPalabra(datos.genero);
  const edad = datos.edad ? `${datos.edad} años` : "";
  const lista = prettyComorb(comorb);
  const antecedentes = lista.length
    ? `con antecedentes de: ${lista.join(", ")}`
    : "sin comorbilidades relevantes registradas";
  const cir = (tipoCirugia || "").trim() || "la cirugía indicada";
  return `${sujeto} ${edad}, ${antecedentes}. Solicita exámenes prequirúrgicos para operarse de ${cir}.`;
}

export default function PreopModulo({ initialDatos }) {
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Paso previo: "Continuar" → llama IA → segundo preview → pago/descarga
  const [stepStarted, setStepStarted] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  // Salida IA y metadatos guardados POR App.jsx
  const [examenesIA, setExamenesIA] = useState([]);
  const [informeIA, setInformeIA] = useState("");
  const [comorbilidades, setComorbilidades] = useState({});
  const [tipoCirugia, setTipoCirugia] = useState("");

  useEffect(() => {
    // Datos paciente (para mostrar)
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    // Tipo cirugía (tomado del formulario principal)
    try {
      const fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
      const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
      const final = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
      setTipoCirugia(final || "");
    } catch {}

    // Comorbilidades (MISMA CLAVE QUE USA App.jsx)
    try {
      const raw = sessionStorage.getItem("preop_comorbilidades_data");
      if (raw) {
        setComorbilidades(JSON.parse(raw));
      } else {
        // compatibilidad retro
        const idPago = sessionStorage.getItem("idPago") || "";
        const legacy = idPago ? sessionStorage.getItem(`preop_comorbilidades_${idPago}`) : null;
        if (legacy) setComorbilidades(JSON.parse(legacy));
      }
    } catch {}

    // IA (si ya existía guardada)
    try {
      const ex = JSON.parse(sessionStorage.getItem("preop_ia_examenes") || "[]");
      const inf = sessionStorage.getItem("preop_ia_resumen") || "";
      setExamenesIA(Array.isArray(ex) ? ex : []);
      setInformeIA(inf);
    } catch {}

    // Retorno de pago (marcar listo, mostrar SEGUNDO preview y hacer polling)
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      setStepStarted(true); // ← clave: quedar en segundo preview
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          // primero ruta específica, si falla, ruta genérica
          let r = await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`);
          if (!r.ok) r = await fetch(`${BACKEND_BASE}/obtener-datos/${idPago}`);
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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ===================== Continuar → LLAMA IA y pasa al preview ===================== */
  const handleContinuar = async () => {
    try {
      setLoadingIA(true);

      // refrescos defensivos por si se editaron justo antes
      try {
        const saved = sessionStorage.getItem("datosPacienteJSON");
        if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}

      let rawComorb = {};
      try { rawComorb = JSON.parse(sessionStorage.getItem("preop_comorbilidades_data") || "{}"); } catch {}
      setComorbilidades(rawComorb || {});

      let fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
      let otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
      const cir = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
      setTipoCirugia(cir || "");

      // asegurar idPago preop
      const idPago =
        sessionStorage.getItem("idPago") ||
        `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "preop");

      const payload = {
        idPago,
        paciente: { ...datos, edad: Number(datos.edad) || datos.edad },
        comorbilidades: rawComorb || {},
        tipoCirugia: cir || "",
      };

      // endpoint principal + fallbacks
      let r = await fetch(`${BACKEND_BASE}/preop-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        r = await fetch(`${BACKEND_BASE}/ia-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();
      const ex = Array.isArray(j?.examenes) ? j.examenes : [];
      const inf = typeof j?.informeIA === "string" ? j.informeIA : "";

      // persistir para PDF/recargas
      try {
        sessionStorage.setItem("preop_ia_examenes", JSON.stringify(ex));
        sessionStorage.setItem("preop_ia_resumen", inf || "");
      } catch {}

      setExamenesIA(ex);
      setInformeIA(inf);
      setStepStarted(true);
    } catch (err) {
      console.error(err);
      alert("No fue posible obtener la información de IA (Preop). Intenta nuevamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  /* ===================== Pago ===================== */
  const handlePagarDesdePreview = async () => {
    const idPago =
      sessionStorage.getItem("idPago") ||
      `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");

    try {
      // guardamos con ruta específica y fallback genérico
      const payload = {
        idPago,
        datosPaciente: { ...datos },
        comorbilidades,
        tipoCirugia,
        examenesIA: Array.isArray(examenesIA) ? examenesIA : [],
        informeIA: informeIA || "",
      };

      let r = await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        r = await fetch(`${BACKEND_BASE}/guardar-datos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idPago, datosPaciente: { ...datos } }),
        });
      }

      await irAPagoKhipu({ ...datos }, { idPago, modulo: "preop" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (pre
