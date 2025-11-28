// src/modules/IAModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { getTheme } from "../theme.js";
import AvisoLegal from "../components/AvisoLegal.jsx";
import FormularioResonancia from "../components/FormularioResonancia.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

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

  const [idPago, setIdPago] = useState(() => {
    try {
      return (
        sessionStorage.getItem("idPago") ||
        "ia_" + Date.now() + "_" + Math.floor(Math.random() * 10000)
      );
    } catch {
      return "ia_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    }
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ================== EFECTO INICIAL ================== */
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
    const idFromURL =
      params.get("idPago") || sessionStorage.getItem("idPago");

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

  /* ================== AVISO LEGAL ================== */
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

  /* ================== DETECCIÓN RM ================== */
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

  /* ================== GENERAR PREVIEW ================== */
  const handleGenerarPreview = async () => {
    const edadNum = Number(datos.edad);

    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0
    ) {
      alert("Completa nombre, RUT y edad (>0) antes de generar el informe.");
      return;
    }
    if (!datos.consulta?.trim()) {
      alert("Escribe tus síntomas / motivo de consulta.");
      return;
    }

    try {
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "ia");
      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({ ...datos, edad: edadNum })
      );
      sessionStorage.setItem("consultaIA", datos.consulta);

      setGenerando(true);
      setPreviewIA("");

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
      if (!j.ok) throw new Error(j.error || "Error generando preview");

      const resp = j.respuesta || "";
      if (!resp.trim()) {
        alert("La IA no devolvió un informe válido.");
        return;
      }

      setPreviewIA(resp);
      sessionStorage.setItem("previewIA", resp);

      window.scrollTo({ top: 0, behavior: "smooth" });

      const pideRM = await detectarRM(resp);
      setRequiereRM(!!pideRM);
      setBloqueaRM(false);
      setResonanciaChecklist(null);
      setResonanciaResumenTexto("");
      setOrdenAlternativa("");

      await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
          informeIA: resp,
        }),
      });
    } catch (err) {
      console.error("Preview error:", err);
      alert("Error al generar el preview IA.");
    } finally {
      setGenerando(false);
    }
  };

  /* ==================  RESUMEN RM  ================== */
  const construirResumenRM = (f = {}) => {
    const labels = {
      marcapasos: "Marcapasos/DAI",
      coclear_o_neuro: "Implante coclear/neuroestimulador",
      clips_aneurisma: "Clips de aneurisma",
      valvula_cardiaca_metal: "Válvula cardíaca metálica",
      fragmentos_metalicos: "Fragmentos metálicos/balas",
      protesis_placas_tornillos: "Prótesis/placas/tornillos",
      cirugia_reciente_3m: "Cirugía reciente (<3m)",
      embarazo: "Embarazo o sospecha",
      claustrofobia: "Claustrofobia importante",
      peso_mayor_150: "Peso > 150 kg",
      no_permanece_inmovil: "Dificultad para inmovilidad",
      tatuajes_recientes: "Tatuajes/PMU < 6 semanas",
      piercings_no_removibles: "Piercings no removibles",
      bomba_insulina_u_otro: "Dispositivo externo activo",
      requiere_contraste: "Requiere contraste",
      erc_o_egyfr_bajo: "Insuficiencia renal",
      alergia_gadolinio: "Alergia a gadolinio",
      reaccion_contrastes: "Reacción previa a contrastes",
      requiere_sedacion: "Requiere sedación",
      ayuno_6h: "Ayuno 6h",
    };

    const marcadas = Object.keys(labels)
      .filter((k) => f[k] === true)
      .map((k) => `• ${labels[k]}`);

    const obs = (f.observaciones || "").trim();

    const partes = [];
    if (marcadas.length) partes.push(marcadas.join("\n"));
    else partes.push("• Sin alertas marcadas.");

    if (obs) partes.push(`Observaciones: ${obs}`);

    return partes.join("\n");
  };

  const lanzarChecklistRM = () => {
    if (!requiereRM) return;
    setShowRM(true);
  };

  const handleSaveRM = (form) => {
    setBloqueaRM(false);

    const resumen = construirResumenRM(form);
    setResonanciaChecklist(form);
    setResonanciaResumenTexto(resumen);

    try {
      sessionStorage.setItem("resonanciaChecklist", JSON.stringify(form));
      sessionStorage.setItem("resonanciaResumenTexto", resumen);
    } catch {}

    fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idPago,
        resonanciaChecklist: form,
        resonanciaResumenTexto: resumen,
      }),
    }).catch(() => {});

    setShowRM(false);
  };

  /* ============================================================
      PAGO – SOLO PREPARA Y SALTA A PANTALLA TRES
     ============================================================ */
  const handlePagarIA = async () => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    const base = saved
      ? JSON.parse(saved)
      : { ...datos, edad: Number(datos.edad) };

    const edadNum = Number(base.edad);

    if (
      !base.nombre?.trim() ||
      !base.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0
    ) {
      alert("Faltan datos básicos del paciente.");
      return;
    }

    const previewGuardado =
      sessionStorage.getItem("previewIA") || previewIA || "";

    if (!previewGuardado.trim()) {
      alert("Debes generar un PREVIEW antes de pagar.");
      return;
    }

    if (requiereRM && !resonanciaChecklist && !bloqueaRM) {
      alert("Completa el checklist de RM antes de pagar.");
      return;
    }

    try {
      // === UNIFICACIÓN EXACTA COMO TRAUMA: UN SOLO IDPAGO COMPLETO ===
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "ia");
      sessionStorage.setItem("pantalla", "tres");
      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({ ...base, edad: edadNum })
      );

      // 🟦 ***PARTE MÁS IMPORTANTE: GUARDAR EXAMEN IA***
      await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          examen: previewGuardado,  // 👈 ESTE TEXTO ES EL QUE VA AL PDF
        }),
      });

      // Guardar consolidación restante
      await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...base, edad: edadNum },
          informeIA: previewGuardado,
          resonanciaChecklist,
          resonanciaResumenTexto,
        }),
      });

      // Ahora saltamos a PantallaTres con TODO unido bajo un idPago.
      if (typeof onIrPantallaTres === "function") {
        onIrPantallaTres({
          ...base,
          edad: edadNum,
          idPago,
        });
      } else {
        alert("No se encontró manejador para PantallaTres.");
      }
    } catch (err) {
      console.error("Pago IA error:", err);
      alert("No se pudo preparar el pago IA.");
    }
  };

  /* ================== DESCARGAS ================== */
  // (No modifiqué nada de estas secciones; las dejaste funcionales)

  // ... aquí siguen exactamente tus funciones
  // handleDescargarIA()
  // handleDescargarOrdenIA()
  // render UI
  // estilos

  /* ================== UI ================== */
  return (
    <div style={S.card}>
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

      {/* resto del componente unchanged */}
      {/* ... */}
    </div>
  );
}

/* ================== ESTILOS ================== */
function makeStyles(T) {
  return {
    card: {
      background: T.surface ?? "#fff",
      borderRadius: 12,
      padding: 16,
      boxShadow: T.shadowSm ?? "0 2px 10px rgba(0,0,0,0.08)",
      border: `1px solid ${T.border ?? "#e8e8e8"}`,
      color: T.text ?? "#1b1b1b",
    },

    // resto de estilos exactamente igual…
  };
}
