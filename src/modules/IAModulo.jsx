// src/modules/IAModulo.jsx
"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import AvisoLegal from "../components/AvisoLegal.jsx";
import FormularioResonancia from "../components/FormularioResonancia.jsx";
import ModuloLayout from "../components/ModuloLayout.jsx";
import logoIA from "../assets/logo_modulo_ia.png";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ============================================================
   🔥 PARSE IA: extrae diagnóstico, explicación y exámenes IA
   ============================================================ */
function parseIA(texto = "") {
  const out = {
    diagnostico: [],
    explicacion: "",
    examenes: [],
    texto: texto || "",
  };
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
      out.explicacion = sec
        .split("\n")
        .slice(1)
        .join(" ")
        .trim();
    }

    if (low.includes("examen") || low.includes("exámenes")) {
      out.examenes = sec
        .split("\n")
        .slice(1)
        .map((l) => l.replace(/^[•\-]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  return out;
}

/* ============================================================
   ID Pago exclusivo IA
   ============================================================ */
function ensureIAIdPago() {
  try {
    let id = sessionStorage.getItem("idPago");
    if (id && /^ia_/.test(id)) return id;
    if (id && /^(trauma_|preop_|generales_|pago_)/.test(id)) {
      const nuevo = `ia_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      sessionStorage.setItem("idPago", nuevo);
      return nuevo;
    }
    const nuevo = `ia_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", nuevo);
    return nuevo;
  } catch {
    return `ia_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

/* ============================================================
   JSON central IA
   ============================================================ */
function buildIAJSON(datos = {}, informeIA = "", opciones = {}, marcadoresStruct = null) {
  const edadNum = Number(datos.edad);
  const paciente = {
    ...datos,
    edad: Number.isFinite(edadNum) && edadNum > 0 ? edadNum : datos.edad,
  };
  const {
    resonanciaChecklist = null,
    resonanciaResumenTexto = "",
    ordenAlternativa = "",
  } = opciones || {};

  return {
    paciente,
    consulta: datos.consulta || "",
    informeIA: informeIA || "",
    marcadores: marcadoresStruct || null,
    resonancia: {
      checklist: resonanciaChecklist,
      resumenTexto: resonanciaResumenTexto,
      ordenAlternativa,
    },
  };
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function IAModulo({ initialDatos, onIrPantallaTres }) {
  const T = getTheme();
  const S = makeStyles(T);

  const [datos, setDatos] = useState(
    initialDatos || {
      nombre: "",
      rut: "",
      edad: "",
      consulta: "",
      genero: "",
      dolor: "",
      lado: "",
    }
  );

  const [previewIA, setPreviewIA] = useState("");
  const [generando, setGenerando] = useState(false);
  const [requiereRM, setRequiereRM] = useState(false);
  const [bloqueaRM, setBloqueaRM] = useState(false);
  const [resonanciaChecklist, setResonanciaChecklist] = useState(null);
  const [resonanciaResumenTexto, setResonanciaResumenTexto] = useState("");
  const [ordenAlternativa, setOrdenAlternativa] = useState("");
  const [showRM, setShowRM] = useState(false);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const [descargandoOrden, setDescargandoOrden] = useState(false);
  const [mensajeDescargaOrden, setMensajeDescargaOrden] = useState("");
  const pollerRef = useRef(null);

  const zonasSoportadas = ["rodilla", "mano", "hombro", "codo", "tobillo"];
  const capitalizar = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  /* ============================================================
     Resumen zonal
     ============================================================ */
  const leerResumenZona = useCallback(
    (zona) => {
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
          const ladoKey = ladoLow.includes("izq")
            ? "izquierda"
            : ladoLow.includes("der")
            ? "derecha"
            : "";

          if (ladoKey) {
            const resumen = JSON.parse(
              sessionStorage.getItem(`${zona}_resumen_${ladoKey}`) || "null"
            );
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
        return {
          zona,
          title: `${capitalizar(zona)}${ladoTxt} — puntos marcados`,
          lines,
          lado,
        };
      } catch {
        return null;
      }
    },
    [datos?.lado]
  );

  /* ============================================================
     Construcción de marcadores
     ============================================================ */
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
          const ladoKey = ladoLow.includes("izq")
            ? "izquierda"
            : ladoLow.includes("der")
            ? "derecha"
            : "";

          if (ladoKey) {
            const resumen = JSON.parse(
              sessionStorage.getItem(`${z}_resumen_${ladoKey}`) || "null"
            );
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
  }, [leerResumenZona]);

  /* ============================================================
     Cargar estado inicial
     ============================================================ */
  useEffect(() => {
    try {
      ensureIAIdPago();
    } catch {}

    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...JSON.parse(saved), ...prev }));

      const savedIA = sessionStorage.getItem("consultaIA");
      if (savedIA) setDatos((prev) => ({ ...prev, consulta: savedIA }));

      const savedPrev = sessionStorage.getItem("previewIA");
      if (savedPrev) setPreviewIA(savedPrev);
    } catch {}

    const avisoOk = (() => {
      try {
        return sessionStorage.getItem("ia_aviso_ok") === "1";
      } catch {
        return false;
      }
    })();

    if (!avisoOk) {
      setMostrarAviso(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idFromURL = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idFromURL) {
      try {
        sessionStorage.setItem("idPago", idFromURL);
      } catch {}
      setPagoRealizado(true);

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

  /* ============================================================
     Aviso legal
     ============================================================ */
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    try {
      sessionStorage.setItem("ia_aviso_ok", "1");
    } catch {}
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  /* ============================================================
     Normalización texto y RM
     ============================================================ */
  const normaliza = (t = "") =>
    String(t || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const contieneRMlocal = (texto = "") => {
    const s = normaliza(texto);
    if (!s) return false;
    const frases = [
      "resonancia magnetica",
      "resonancia nuclear",
      "magnetic resonance",
    ];
    if (frases.some((p) => s.includes(p))) return true;

    const re = [/\brm\b/i, /\brmn\b/i, /\brnm\b/i, /\bmri\b/i, /\birm\b/i];
    return re.some((rx) => rx.test(texto));
  };

  const detectarRM = async (textoBase) => {
    const examenTexto = textoBase || previewIA || datos.consulta || "";
    if (!examenTexto.trim()) return false;

    try {
      const r = await fetch(`${BACKEND_BASE}/detectar-resonancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datosPaciente: { ...datos, examen: examenTexto },
        }),
      });

      if (r.ok) {
        const j = await r.json();
        if (typeof j?.resonancia === "boolean") return j.resonancia;
        return contieneRMlocal(j?.texto || examenTexto);
      }
    } catch {}

    return contieneRMlocal(examenTexto);
  };

  const lanzarChecklistRM = () => {
    if (!requiereRM) return;
    setShowRM(true);
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

  /* ============================================================
     Guardar RM
     ============================================================ */
  const handleSaveRM = (form) => {
    setBloqueaRM(false);
    const resumen = construirResumenRM(form);
    setResonanciaChecklist(form);
    setResonanciaResumenTexto(resumen);

    try {
      sessionStorage.setItem("resonanciaChecklist", JSON.stringify(form));
      sessionStorage.setItem("resonanciaResumenTexto", resumen);

      const respaldo = sessionStorage.getItem("datosPacienteJSON");
      const base = respaldo ? JSON.parse(respaldo) : { ...datos };

      const marcadoresStruct = construirMarcadores();

      const iaJSON = buildIAJSON(
        { ...base },
        previewIA || datos.consulta || "",
        {
          resonanciaChecklist: form,
          resonanciaResumenTexto: resumen,
          ordenAlternativa,
        },
        marcadoresStruct
      );

      sessionStorage.setItem("iaJSON", JSON.stringify(iaJSON));
    } catch {}

    setShowRM(false);
  };

  /* ============================================================
     GENERAR PREVIEW IA
     ============================================================ */
  const handleGenerarPreview = async () => {
    const edadNum = Number(datos.edad);

    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0) {
      alert("Completa nombre, RUT y edad (>0).");
      return;
    }
    if (!datos.consulta?.trim()) {
      alert("Escribe tus síntomas/indicaciones en el cuadro de texto.");
      return;
    }

    const idPago = ensureIAIdPago();
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "ia");
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));
    sessionStorage.setItem("consultaIA", datos.consulta);

    setGenerando(true);
    setPreviewIA("");

    try {
      const res = await fetch(`${BACKEND_BASE}/api/preview-informe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          consulta: datos.consulta,
          nombre: datos.nombre,
          edad: edadNum,
          rut: datos.rut,
          genero: datos.genero,
          dolor: datos.dolor,
          lado: datos.lado,
        }),
      });

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "No se pudo generar el preview");

      const resp = j.respuesta || "";
      const parsed = parseIA(resp);

      // Determinar lista de exámenes proveniente del backend o del parsing
      const listaExamenes = (() => {
        if (Array.isArray(j.examenes) && j.examenes.length) return j.examenes;
        if (parsed.examenes.length) return parsed.examenes;
        return [];
      })();

      setPreviewIA(resp);
      sessionStorage.setItem("previewIA", resp);

      const pideRM = await detectarRM(resp);
      setRequiereRM(!!pideRM);
      setBloqueaRM(false);
      setResonanciaChecklist(null);
      setResonanciaResumenTexto("");
      setOrdenAlternativa("");

      const marcadoresStruct = construirMarcadores();
      const { marcadores, rodillaMarcadores, manoMarcadores, hombroMarcadores, codoMarcadores, tobilloMarcadores } =
        marcadoresStruct;

      const iaJSON = buildIAJSON(
        { ...datos, edad: edadNum },
        resp,
        { resonanciaChecklist, resonanciaResumenTexto, ordenAlternativa },
        marcadoresStruct
      );
      iaJSON.examenes = listaExamenes;

      sessionStorage.setItem("iaJSON", JSON.stringify(iaJSON));

     await fetch(`${BACKEND_BASE}/api/preview-informe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          iaJSON,
          datosPaciente: iaJSON.paciente,

          // 🔥 debugIA: LO QUE EL BACKEND NECESITA
          debugIA: {
            diagnostico: parsed.diagnostico,
            explicacion: parsed.explicacion,
            examenes: listaExamenes,
            texto: resp,
          },

          examen: listaExamenes.join(" | "),
          examenes: listaExamenes,

          marcadores,
          rodillaMarcadores,
          manoMarcadores,
          hombroMarcadores,
          codoMarcadores,
          tobilloMarcadores,
        }),
      });
    } catch (err) {
      console.error("Preview IA error:", err);
      alert("Error al generar el preview de IA.");
    } finally {
      setGenerando(false);
    }
  };

  /* ============================================================
     PAGAR IA
     ============================================================ */
  const handlePagarIA = async () => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    const base = saved ? JSON.parse(saved) : datos;
    const edadNum = Number(base.edad);

    if (!base.nombre?.trim() || !base.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0) {
      alert("Completa nombre, RUT y edad (>0).");
      return;
    }

    const idPago = ensureIAIdPago();
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "ia");
    sessionStorage.setItem("pantalla", "tres");
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...base, edad: edadNum }));

    try {
      const marcadoresStruct = construirMarcadores();
      const { marcadores, rodillaMarcadores, manoMarcadores, hombroMarcadores, codoMarcadores, tobilloMarcadores } =
        marcadoresStruct;

      const textoInforme = previewIA || datos.consulta || "";
      const parsed = parseIA(textoInforme);

      let examenesPrevios = [];
      try {
        const prevIA = JSON.parse(sessionStorage.getItem("iaJSON") || "null");
        if (prevIA && Array.isArray(prevIA.examenes)) examenesPrevios = prevIA.examenes;
      } catch {}

      const iaJSON = buildIAJSON(
        { ...base, edad: edadNum },
        textoInforme,
        { resonanciaChecklist, resonanciaResumenTexto, ordenAlternativa },
        marcadoresStruct
      );
      iaJSON.examenes = examenesPrevios;

      sessionStorage.setItem("iaJSON", JSON.stringify(iaJSON));

     await fetch(`${BACKEND_BASE}/api/preview-informe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          iaJSON,
          datosPaciente: iaJSON.paciente,

          debugIA: {
            diagnostico: parsed.diagnostico,
            explicacion: parsed.explicacion,
            examenes: iaJSON.examenes,
            texto: textoInforme,
          },

          examen: (iaJSON.examenes || []).join(" | "),
          examenes: iaJSON.examenes || [],

          marcadores,
          rodillaMarcadores,
          manoMarcadores,
          hombroMarcadores,
          codoMarcadores,
          tobilloMarcadores,
          resonanciaChecklist,
          resonanciaResumenTexto,
        }),
      });

      if (typeof onIrPantallaTres === "function") {
        onIrPantallaTres({
          ...base,
          edad: edadNum,
          idPago,
        });
      }
    } catch (err) {
      console.error("No se pudo preparar el pago (IA):", err);
      alert(`No se pudo preparar el pago.\n${err?.message || err}`);
    }
  };

  /* ============================================================
     DESCARGAR PDF INFORME IA
     ============================================================ */
  const handleDescargarIA = async () => {
    const id = sessionStorage.getItem("idPago") || ensureIAIdPago();
    if (!id) {
      alert("ID de pago no encontrado.");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/api/pdf-ia/${id}`, {
        cache: "no-store",
      });

      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `informeIA_${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    };

    setDescargando(true);
    setMensajeDescarga("Verificando pago…");

    try {
      const r = await intentaDescarga();
      if (!r.ok) {
        if (r.status === 402) alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
        else if (r.status === 404)
          alert("No se encontró el PDF del informe IA. Si ya pagaste, genera nuevamente el informe IA para reconstruirlo.");
        else alert("No se pudo descargar el PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  /* ============================================================
     DESCARGAR ORDEN IA
     ============================================================ */
  const handleDescargarOrdenIA = async () => {
    const id = sessionStorage.getItem("idPago") || ensureIAIdPago();
    if (!id) {
      alert("ID de pago no encontrado.");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/api/pdf-ia-orden/${id}`, {
        cache: "no-store",
      });

      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `ordenIA_${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    };

    setDescargandoOrden(true);
    setMensajeDescargaOrden("Verificando pago…");

    try {
      const r = await intentaDescarga();
      if (!r.ok) {
        if (r.status === 402)
          alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
        else if (r.status === 404)
          alert(
            "No se encontró la orden de exámenes IA. Si ya pagaste, genera nuevamente el informe IA para reconstruirla."
          );
        else alert("No se pudo descargar la orden.");
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo descargar la orden.");
    } finally {
      setDescargandoOrden(false);
      setMensajeDescargaOrden("");
    }
  };

  /* ============================================================
     UI
     ============================================================ */
  return (
    <ModuloLayout
      logo={logoIA}
      variant="ia"
      title="Asistente IA"
      subtitle={
        previewIA
          ? "Informe IA generado — revisa antes de continuar."
          : "Describe los síntomas para generar el informe."
      }
    >
      <AvisoLegal
        visible={mostrarAviso}
        persist={false}
        onAccept={continuarTrasAviso}
        onReject={rechazarAviso}
      />

      <h3 style={{ marginTop: 0, color: T.primaryDark || T.primary }}>
        {previewIA
          ? "Informe IA generado — revisa antes de continuar."
          : "Describe los síntomas para generar el informe."}
      </h3>

      <div style={{ marginBottom: 10 }}>
        <div style={S.grid1}>
          <label style={S.label}>
            Nombre
            <input
              type="text"
              value={datos.nombre || ""}
              onChange={(e) => setDatos((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre del paciente"
              style={S.input}
            />
          </label>

          <label style={S.label}>
            RUT
            <input
              type="text"
              value={datos.rut || ""}
              onChange={(e) => setDatos((p) => ({ ...p, rut: e.target.value }))}
              placeholder="11.111.111-1"
              style={S.input}
            />
          </label>

          <label style={S.label}>
            Edad
            <input
              type="number"
              value={datos.edad || ""}
              onChange={(e) => setDatos((p) => ({ ...p, edad: e.target.value }))}
              placeholder="Edad"
              style={S.input}
            />
          </label>
        </div>
      </div>

      {seccionesZonas.length > 0 && (
        <div style={S.block}>
          {seccionesZonas.map((sec, idx) => (
            <div key={`${sec.zona}-${idx}`} style={{ marginBottom: 8 }}>
              <strong>{sec.title}</strong>
              <ul style={{ marginTop: 6 }}>
                {sec.lines.map((l, i) => (
                  <li key={`${sec.zona}-${i}`}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div>
        <strong>Consulta / Indicaciones:</strong>
        <textarea
          rows={6}
          value={datos.consulta || ""}
          onChange={(e) => setDatos((p) => ({ ...p, consulta: e.target.value }))}
          placeholder="Escribe aquí tus síntomas."
          style={S.textarea}
        />

        <button
          style={{ ...S.btnPrimary, marginTop: 12 }}
          onClick={handleGenerarPreview}
          disabled={generando}
        >
          {generando ? "Generando preview…" : "Generar PREVIEW IA"}
        </button>
      </div>

      {previewIA && (
        <div style={{ marginTop: 14 }}>
          <strong>Preview generado:</strong>
          <pre style={S.pre}>{previewIA}</pre>
        </div>
      )}

      {previewIA && requiereRM && !resonanciaChecklist && !bloqueaRM && (
        <div style={S.hint}>
          La IA sugiere Resonancia Magnética. Presione “Continuar” para completar el checklist.
        </div>
      )}

      {previewIA && bloqueaRM && (
        <div style={S.hint}>
          RM contraindicada. {ordenAlternativa || "Se sugiere alternativa."}
        </div>
      )}

      {!pagoRealizado && previewIA && (
        <>
          {requiereRM && !resonanciaChecklist && !bloqueaRM && (
            <button style={{ ...S.btnPrimary, marginTop: 12 }} onClick={lanzarChecklistRM}>
              Continuar
            </button>
          )}

          {(!requiereRM || resonanciaChecklist || bloqueaRM) && (
            <button style={{ ...S.btnPrimary, marginTop: 12 }} onClick={handlePagarIA}>
              Pagar ahora (Informe IA)
            </button>
          )}
        </>
      )}

      {pagoRealizado && (
        <>
          <button
            style={{ ...S.btnPrimary, marginTop: 12 }}
            onClick={handleDescargarIA}
            disabled={descargando}
            title={mensajeDescarga || "Verificar y descargar"}
          >
            {descargando ? mensajeDescarga : "Descargar Informe IA"}
          </button>

          <button
            style={{ ...S.btnPrimary, marginTop: 8 }}
            onClick={handleDescargarOrdenIA}
            disabled={descargandoOrden}
            title={mensajeDescargaOrden || "Verificar y descargar"}
          >
            {descargandoOrden ? mensajeDescargaOrden : "Descargar Orden de Exámenes (IA)"}
          </button>
        </>
      )}

      {showRM && (
        <div style={S.modalBackdrop} role="dialog" aria-modal="true">
          <div style={S.modalCard}>
            <h4 style={{ margin: 8, color: T.primary }}>Checklist de Resonancia</h4>
            <FormularioResonancia
              initial={resonanciaChecklist || {}}
              onSave={handleSaveRM}
              onCancel={() => setShowRM(false)}
            />
          </div>
        </div>
      )}
    </ModuloLayout>
  );
}

/* ============================================================
   ESTILOS
   ============================================================ */
function makeStyles(T) {
  return {
    grid1: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 12,
    },
    label: { display: "flex", flexDirection: "column", gap: 6 },
    input: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: `1px solid ${T.border ?? "#ddd"}`,
      background: T.bg ?? "#fff",
      color: T.text ?? "#1b1b1b",
      fontSize: 16,
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: `1px solid ${T.border ?? "#ddd"}`,
      background: T.bg ?? "#fff",
      color: T.text ?? "#1b1b1b",
      fontSize: 16,
      marginTop: 6,
      boxSizing: "border-box",
    },
    btnPrimary: {
      backgroundColor: T.primary ?? "#0072CE",
      color: T.onPrimary ?? "#fff",
      border: "none",
      padding: "12px",
      borderRadius: 8,
      fontSize: 16,
      cursor: "pointer",
      width: "100%",
      boxShadow: T.shadowSm ?? "0 1px 4px rgba(0,0,0,0.08)",
    },
    pre: {
      whiteSpace: "pre-wrap",
      background: T.codeBg ?? "#f7f7f7",
      borderRadius: 8,
      padding: 12,
      lineHeight: 1.4,
      border: `1px solid ${T.border ?? "#e8e8e8"}`,
      color: T.text ?? "#1b1b1b",
    },
    block: { marginTop: 12 },
    hint: {
      marginTop: 10,
      fontStyle: "italic",
      color: T.textMuted ?? "#666",
    },
    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 50,
    },
    modalCard: {
      width: "min(920px, 100%)",
      maxHeight: "90vh",
      overflow: "auto",
      background: T.surface ?? "#fff",
      borderRadius: 12,
      boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      border: `1px solid ${T.border ?? "#e8e8e8"}`,
      padding: 12,
    },
  };
}
