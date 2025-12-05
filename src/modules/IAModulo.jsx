// ======================================================================
// IAModulo.jsx — VÍA ÚNICA DE COMUNICACIÓN (iaJSON) — 100% igual filosofía Trauma
// ======================================================================

"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import AvisoLegal from "../components/AvisoLegal.jsx";
import FormularioResonancia from "../components/FormularioResonancia.jsx";
import ModuloLayout from "../components/ModuloLayout.jsx";
import logoIA from "../assets/logo_modulo_ia.png";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

// ============================================================
// Helpers
// ============================================================

function ensureIAIdPago() {
  try {
    const id = sessionStorage.getItem("idPago");
    if (id && id.trim()) return id;
    const nuevo = `ia_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", nuevo);
    return nuevo;
  } catch {
    const nuevo = `ia_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    return nuevo;
  }
}

function parseIA(texto = "") {
  const out = { diagnostico: [], explicacion: "", examenes: [], texto };
  if (!texto) return out;

  const secciones = texto.split(/\n\s*\n/);
  for (const sec of secciones) {
    const low = sec.toLowerCase();

    if (low.includes("diagnóstico") || low.includes("diagnostico")) {
      out.diagnostico = sec
        .split("\n")
        .slice(1)
        .map((l) => l.replace(/^[•\-]\s*/, "").trim())
        .filter(Boolean);
    }
    if (low.includes("explicación") || low.includes("explicacion")) {
      out.explicacion = sec.split("\n").slice(1).join(" ").trim();
    }
    if (low.includes("examen")) {
      out.examenes = sec
        .split("\n")
        .slice(1)
        .map((l) => l.replace(/^[•\-]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  return out;
}

// ============================================================
// Builder JSON — ÚNICA FUENTE DE VERDAD
// ============================================================
function buildIAJSON(paciente, informeIA, examenes, marcadoresStruct, resonancia) {
  return {
    paciente,
    consulta: paciente.consulta || "",
    informeIA,
    examenes,                // ARRAY — la IA manda 1 o 2 exámenes
    marcadores: marcadoresStruct || {},
    resonancia: resonancia || {
      checklist: null,
      resumenTexto: "",
      ordenAlternativa: "",
    }
  };
}

// ============================================================
// Componente principal
// ============================================================
export default function IAModulo({ initialDatos, onIrPantallaTres }) {
  const T = getTheme();
  const S = makeStyles(T);

  const [datos, setDatos] = useState(
    initialDatos || {
      nombre: "",
      rut: "",
      edad: "",
      genero: "",
      dolor: "",
      lado: "",
      consulta: "",
    }
  );

  const [previewIA, setPreviewIA] = useState("");
  const [generando, setGenerando] = useState(false);
  const [requiereRM, setRequiereRM] = useState(false);
  const [resonanciaChecklist, setResonanciaChecklist] = useState(null);
  const [resonanciaResumenTexto, setResonanciaResumenTexto] = useState("");
  const [ordenAlternativa, setOrdenAlternativa] = useState("");

  const [pagoRealizado, setPagoRealizado] = useState(false);

  // ============================================================
  // Marcadores (idéntico trauma)
  // ============================================================
  const zonas = ["rodilla", "mano", "hombro", "codo", "tobillo"];

  const construirMarcadores = useCallback(() => {
    const out = {};
    zonas.forEach((z) => {
      try {
        const raw = JSON.parse(sessionStorage.getItem(`${z}_data`) || "null");
        if (!raw) return;
        out[z] = {
          lado: raw.lado || "",
          porVista: raw.porVista || null,
          puntosSeleccionados: raw.puntosSeleccionados || []
        };
      } catch {}
    });
    return out;
  }, []);

  // ============================================================
  // Cargar estado inicial
  // ============================================================
  useEffect(() => {
    ensureIAIdPago();

    const prev = sessionStorage.getItem("previewIA");
    if (prev) setPreviewIA(prev);

    const savedDatos = sessionStorage.getItem("datosPacienteJSON");
    if (savedDatos) setDatos(JSON.parse(savedDatos));

    const params = new URLSearchParams(window.location.search);
    if (params.get("pago") === "ok") setPagoRealizado(true);
  }, []);

  // ============================================================
  // Generar Preview IA
  // ============================================================
  const handleGenerarPreview = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre || !datos.rut || !edadNum) {
      alert("Debe completar nombre, rut y edad válida.");
      return;
    }
    if (!datos.consulta.trim()) {
      alert("Debe escribir la consulta / síntomas.");
      return;
    }

    const idPago = ensureIAIdPago();
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));

    setGenerando(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/preview-informe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          nombre: datos.nombre,
          rut: datos.rut,
          edad: edadNum,
          genero: datos.genero,
          dolor: datos.dolor,
          lado: datos.lado,
          consulta: datos.consulta,
          marcadores: construirMarcadores(),     // SOLO PARA PROMPT IA
        }),
      });

      const j = await res.json();
      if (!j.ok) throw new Error(j.error);

      const texto = j.respuesta || "";
      setPreviewIA(texto);
      sessionStorage.setItem("previewIA", texto);

      // Parseamos exámenes de la IA
      const parsed = parseIA(texto);
      const examenes = parsed.examenes || [];

      // Detectar RM
      const contieneRM = examenes.some((e) =>
        /resonancia|rm\b|magnética/i.test(e)
      );
      setRequiereRM(contieneRM);

      // Guardar JSON unificado (pero SIN RM aún)
      const marcadoresStruct = construirMarcadores();
      const iaJSON = buildIAJSON(
        datos,
        texto,
        examenes,
        marcadoresStruct,
        {} // RM aún vacío
      );

      sessionStorage.setItem("iaJSON", JSON.stringify(iaJSON));

      // Enviar al backend
      await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, iaJSON }),
      });
    } catch (err) {
      console.error(err);
      alert("Error generando IA");
    } finally {
      setGenerando(false);
    }
  };

  // ============================================================
  // Guardar RM dentro del iaJSON y reenviar
  // ============================================================
  const handleSaveRM = async (form) => {
    const resumen = Object.entries(form)
      .filter(([k, v]) => v === true)
      .map(([k]) => `• ${k}`)
      .join("\n");

    setResonanciaChecklist(form);
    setResonanciaResumenTexto(resumen);

    const idPago = ensureIAIdPago();
    const iaJSON = JSON.parse(sessionStorage.getItem("iaJSON") || "{}");

    iaJSON.resonancia = {
      checklist: form,
      resumenTexto: resumen,
      ordenAlternativa,
    };

    sessionStorage.setItem("iaJSON", JSON.stringify(iaJSON));

    await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, iaJSON }),
    });
  };

  // ============================================================
  // Pagar IA
  // ============================================================
  const handlePagarIA = async () => {
    const idPago = ensureIAIdPago();
    const iaJSON = JSON.parse(sessionStorage.getItem("iaJSON") || "{}");

    await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, iaJSON }),
    });

    await irAPagoKhipu({
      idPago,
      datosPaciente: iaJSON.paciente,
      modulo: "ia",
    });

    if (onIrPantallaTres) onIrPantallaTres(iaJSON.paciente);
  };

  // ============================================================
  // DESCARGA PDF INFORME
  // ============================================================
  const descargarPDF = async () => {
    const idPago = ensureIAIdPago();
    const res = await fetch(`${BACKEND_BASE}/api/pdf-ia/${idPago}`);
    if (!res.ok) return alert("No disponible todavía");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informeIA_${datos.nombre}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // DESCARGA PDF ORDEN IA
  // ============================================================
  const descargarOrden = async () => {
    const idPago = ensureIAIdPago();
    const res = await fetch(`${BACKEND_BASE}/api/pdf-ia-orden/${idPago}`);
    if (!res.ok) return alert("No disponible todavía");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordenIA_${datos.nombre}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <ModuloLayout logo={logoIA} variant="ia" title="Asistente IA">
      <AvisoLegal visible={false} />

      <h3>Asistente IA</h3>

      {/* Datos */}      
      <div style={S.grid1}>
        <label>
          Nombre
          <input
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            style={S.input}
          />
        </label>

        <label>
          RUT
          <input
            value={datos.rut}
            onChange={(e) => setDatos({ ...datos, rut: e.target.value })}
            style={S.input}
          />
        </label>

        <label>
          Edad
          <input
            type="number"
            value={datos.edad}
            onChange={(e) => setDatos({ ...datos, edad: e.target.value })}
            style={S.input}
          />
        </label>
      </div>

      <label style={{ marginTop: 10 }}>
        Consulta / Síntomas
        <textarea
          rows={5}
          value={datos.consulta}
          onChange={(e) =>
            setDatos({ ...datos, consulta: e.target.value })
          }
          style={S.textarea}
        />
      </label>

      <button style={S.btnPrimary} onClick={handleGenerarPreview}>
        {generando ? "Generando..." : "GENERAR PREVIEW IA"}
      </button>

      {previewIA && (
        <pre style={S.pre}>{previewIA}</pre>
      )}

      {requiereRM && !resonanciaChecklist && (
        <button style={S.btnPrimary} onClick={() => setShowRM(true)}>
          Completar checklist RM
        </button>
      )}

      {!pagoRealizado && previewIA && (
        <button style={S.btnPrimary} onClick={handlePagarIA}>
          PAGAR Y GENERAR INFORME
        </button>
      )}

      {pagoRealizado && (
        <>
          <button style={S.btnPrimary} onClick={descar}>
            Descargar Informe IA
          </button>

          <button style={S.btnPrimary} onClick={descargarOrden}>
            Descargar Orden IA
          </button>
        </>
      )}
    </ModuloLayout>
  );
}

// ============================================================
// Estilos
// ============================================================
function makeStyles(T) {
  return {
    grid1: { display: "grid", gap: 10 },
    input: {
      padding: 10,
      borderRadius: 8,
      border: "1px solid #ccc",
      width: "100%",
    },
    textarea: {
      padding: 10,
      borderRadius: 8,
      border: "1px solid #ccc",
      width: "100%",
    },
    btnPrimary: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      background: T.primary,
      color: "white",
      border: "none",
    },
    pre: {
      whiteSpace: "pre-wrap",
      background: "#f1f1f1",
      padding: 10,
      borderRadius: 8,
      marginTop: 10,
    }
  };
}
