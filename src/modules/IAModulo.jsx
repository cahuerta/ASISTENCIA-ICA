// src/modules/IAModulo.jsx
"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import AvisoLegal from "../components/AvisoLegal.jsx"; // ← NUEVO: Aviso Legal
import FormularioResonancia from "../components/FormularioResonancia.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

export default function IAModulo({ initialDatos }) {
  const T = getTheme();
  const S = makeStyles(T);

  // ===== Estado base
  const [datos, setDatos] = useState(
    initialDatos || { nombre: "", rut: "", edad: "", consulta: "", genero: "", dolor: "", lado: "" }
  );
  const [previewIA, setPreviewIA] = useState("");
  const [generando, setGenerando] = useState(false);

  // ===== Estados RM (mismo patrón que Trauma)
  const [requiereRM, setRequiereRM] = useState(false);
  const [bloqueaRM, setBloqueaRM] = useState(false);
  const [resonanciaChecklist, setResonanciaChecklist] = useState(null);
  const [resonanciaResumenTexto, setResonanciaResumenTexto] = useState("");
  const [ordenAlternativa, setOrdenAlternativa] = useState("");

  // Modal local del FormularioResonancia
  const [showRM, setShowRM] = useState(false);

  // Aviso legal (gating)
  const [mostrarAviso, setMostrarAviso] = useState(false);

  // Pago/descarga
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const [descargandoOrden, setDescargandoOrden] = useState(false);
  const [mensajeDescargaOrden, setMensajeDescargaOrden] = useState("");
  const pollerRef = useRef(null);

  // ID de pago/módulo
  const [idPago, setIdPago] = useState(() => {
    return (
      sessionStorage.getItem("idPago") ||
      "ia_" + Date.now() + "_" + Math.floor(Math.random() * 10000)
    );
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ========= Helpers de mapeadores (zonas) ========= */
  const zonasSoportadas = ["rodilla", "mano", "hombro", "codo", "tobillo"];
  const capitalizar = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  // Lee y arma un resumen visible para UI por zona (flatten, único)
  const leerResumenZona = useCallback((zona) => {
    try {
      const data = JSON.parse(sessionStorage.getItem(`${zona}_data`) || "null");
      const lado = data?.lado || datos?.lado || "";
      const extra = JSON.parse(sessionStorage.getItem(`${zona}_seccionesExtra`) || "null");
      let lines = [];
      if (Array.isArray(extra)) {
        for (const sec of extra) {
          if (Array.isArray(sec?.lines)) lines.push(...sec.lines);
        }
      }
      if (!lines.length && Array.isArray(data?.puntosSeleccionados)) {
        lines = data.puntosSeleccionados;
      }
      if (!lines.length) {
        const ladoLow = (lado || "").toLowerCase();
        const ladoKey = ladoLow.includes("izq") ? "izquierda" : (ladoLow.includes("der") ? "derecha" : "");
        if (ladoKey) {
          const resumen = JSON.parse(sessionStorage.getItem(`${zona}_resumen_${ladoKey}`) || "null");
          if (resumen && typeof resumen === "object") {
            Object.values(resumen).forEach((arr) => {
              if (Array.isArray(arr)) lines.push(...arr);
            });
          }
        }
      }
      lines = Array.from(new Set(lines));
      if (!lines.length) return null;
      const ladoTxt = lado ? ` — ${capitalizar(lado)}` : "";
      return { zona, title: `${capitalizar(zona)}${ladoTxt} — puntos marcados`, lines, lado };
    } catch {
      return null;
    }
  }, [datos?.lado]);

  // Construye payload general de marcadores para backend
  const construirMarcadores = useCallback(() => {
    const marcadores = {};
    const porCompat = {};
    zonasSoportadas.forEach((z) => {
      try {
        const data = JSON.parse(sessionStorage.getItem(`${z}_data`) || "null");
        const extra = JSON.parse(sessionStorage.getItem(`${z}_seccionesExtra`) || "null");
        const lado = data?.lado || "";
        if (data && (Array.isArray(data.puntosSeleccionados) || data.porVista)) {
          marcadores[z] = {
            lado: data.lado || "",
            porVista: data.porVista || null,
            puntosSeleccionados: data.puntosSeleccionados || [],
            count: data.count ?? (data.puntosSeleccionados?.length || 0),
            seccionesExtra: Array.isArray(extra) ? extra : undefined,
          };
        } else {
          const ladoLow = (lado || datos?.lado || "").toLowerCase();
          const ladoKey = ladoLow.includes("izq") ? "izquierda" : (ladoLow.includes("der") ? "derecha" : "");
          if (ladoKey) {
            const resumen = JSON.parse(sessionStorage.getItem(`${z}_resumen_${ladoKey}`) || "null");
            if (resumen && typeof resumen === "object") {
              marcadores[z] = { lado: ladoKey, porVista: resumen };
            }
          }
        }
        if (marcadores[z]?.porVista) {
          porCompat[`${z}Marcadores`] = marcadores[z].porVista;
        }
      } catch {}
    });
    return { marcadores, ...porCompat };
  }, [datos?.lado]);

  const seccionesZonas = useMemo(() => {
    const out = [];
    for (const z of zonasSoportadas) {
      const sec = leerResumenZona(z);
      if (sec && Array.isArray(sec.lines) && sec.lines.length) out.push(sec);
    }
    return out;
  }, [leerResumenZona, previewIA, resonanciaChecklist, showRM]);

  // ===== Montaje
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
      const savedIA = sessionStorage.getItem("consultaIA");
      if (savedIA) setDatos((prev) => ({ ...prev, consulta: savedIA }));
      const savedPrev = sessionStorage.getItem("previewIA");
      if (savedPrev) setPreviewIA(savedPrev);
      const savedId = sessionStorage.getItem("idPago");
      if (savedId) setIdPago(savedId);
    } catch {}

    const avisoOk = (() => {
      try { return sessionStorage.getItem("ia_aviso_ok") === "1"; } catch { return false; }
    })();
    if (!avisoOk) {
      setMostrarAviso(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idFromURL = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idFromURL) {
      setPagoRealizado(true);
      fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago: idFromURL }),
      }).catch(() => {});
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          await fetch(`${BACKEND_BASE}/api/obtener-datos-ia/${idFromURL}`);
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

  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    try { sessionStorage.setItem("ia_aviso_ok", "1"); } catch {}
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  /* ================= FRASES AUTORIZADAS ================= */
  const fraseActual = useMemo(() => {
    if (!previewIA) return "Describe los síntomas para generar el informe con IA.";
    return "Informe IA generado — revisa el contenido antes de continuar.";
  }, [previewIA]);

  // ===== UI
  return (
    <div style={S.card}>
      <AvisoLegal visible={mostrarAviso} persist={false} onAccept={continuarTrasAviso} onReject={rechazarAviso} />

      {/* Frase principal dinámica */}
      <h3 style={{ marginTop: 0, color: T.primaryDark || T.primary }}>{fraseActual}</h3>
