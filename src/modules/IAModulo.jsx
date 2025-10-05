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
      const data = JSON.parse(sessionStorage.getItem(`${zona}_data`) || "null"); // { lado, puntosSeleccionados, porVista, ... }
      const lado = data?.lado || datos?.lado || "";
      const extra = JSON.parse(sessionStorage.getItem(`${zona}_seccionesExtra`) || "null"); // [{title,lines}]
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
        // Intento final con *_resumen_{izquierda|derecha}
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
        // Objeto compacto porZona
        if (data && (Array.isArray(data.puntosSeleccionados) || data.porVista)) {
          marcadores[z] = {
            lado: data.lado || "",
            porVista: data.porVista || null,
            puntosSeleccionados: data.puntosSeleccionados || [],
            count: data.count ?? (data.puntosSeleccionados?.length || 0),
            seccionesExtra: Array.isArray(extra) ? extra : undefined,
          };
        } else {
          // fallback a *_resumen_{lado}
          const ladoLow = (lado || datos?.lado || "").toLowerCase();
          const ladoKey = ladoLow.includes("izq") ? "izquierda" : (ladoLow.includes("der") ? "derecha" : "");
          if (ladoKey) {
            const resumen = JSON.parse(sessionStorage.getItem(`${z}_resumen_${ladoKey}`) || "null");
            if (resumen && typeof resumen === "object") {
              marcadores[z] = { lado: ladoKey, porVista: resumen };
            }
          }
        }
        // Compat: zMarcadores plano (porVista si existe)
        if (marcadores[z]?.porVista) {
          porCompat[`${z}Marcadores`] = marcadores[z].porVista;
        }
      } catch {}
    });
    return { marcadores, ...porCompat };
  }, [datos?.lado]);

  // Secciones visibles en el preview (todas las zonas con contenido)
  const seccionesZonas = useMemo(() => {
    const out = [];
    for (const z of zonasSoportadas) {
      const sec = leerResumenZona(z);
      if (sec && Array.isArray(sec.lines) && sec.lines.length) out.push(sec);
    }
    return out;
  }, [leerResumenZona, previewIA, resonanciaChecklist, showRM]);

  // ===== Montaje: sincroniza datos y detecta retorno de pago (con gating de aviso legal)
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

    // === Aviso Legal ===
    const avisoOk = (() => {
      try { return sessionStorage.getItem("ia_aviso_ok") === "1"; } catch { return false; }
    })();
    if (!avisoOk) {
      setMostrarAviso(true);
      return; // no seguimos con detección de pago hasta aceptar
    }

    // retorno de pago
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idFromURL = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idFromURL) {
      setPagoRealizado(true);
      // Confirmar pago en backend IA (marcar pagoConfirmado = true)
      fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago: idFromURL }),
      }).catch(() => {});
      // Warm-up a obtener-datos-ia
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

  // Handlers Aviso Legal
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    try { sessionStorage.setItem("ia_aviso_ok", "1"); } catch {}
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  // ====== Detección robusta de RM ======
  const normaliza = (t = "") =>
    String(t || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const contieneRMlocal = (texto = "") => {
    const s = normaliza(texto);
    if (!s) return false;

    // Frases
    const frases = [
      "resonancia magnetica",
      "resonancia nuclear",
      "magnetic resonance",
    ];
    if (frases.some((p) => s.includes(p))) return true;

    // Abreviaturas comunes
    const re = [/\brm\b/i, /\brmn\b/i, /\brnm\b/i, /\bmri\b/i, /\birm\b/i];
    return re.some((rx) => rx.test(texto));
  };

  // Primero backend (si falla, fallback local)
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
    // fallback local
    return contieneRMlocal(examenTexto);
  };

  // ===== Generar PREVIEW (GPT)
  const handleGenerarPreview = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0
    ) {
      alert("Completa nombre, RUT y edad (>0).");
      return;
    }
    if (!datos.consulta?.trim()) {
      alert("Escribe tus síntomas/indicaciones en el cuadro de texto.");
      return;
    }

    // Persistir en sesión
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "ia");
    sessionStorage.setItem(
      "datosPacienteJSON",
      JSON.stringify({ ...datos, edad: edadNum })
    );
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
          // enviar también estos campos
          genero: datos.genero,
          dolor: datos.dolor,
          lado: datos.lado,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "No se pudo generar el preview");
      const resp = j.respuesta || "";
      setPreviewIA(resp);
      sessionStorage.setItem("previewIA", resp);
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Detectar si el preview sugiere RM (sin abrir checklist aún)
      try {
        const pide = await detectarRM(resp);
        setRequiereRM(!!pide);
        setBloqueaRM(false);
        setResonanciaChecklist(null);
        setResonanciaResumenTexto("");
        setOrdenAlternativa("");
      } catch {}

      // 💾 Guardar también los marcadores seleccionados (todas las zonas)
      try {
        const { marcadores, rodillaMarcadores, manoMarcadores, hombroMarcadores, codoMarcadores, tobilloMarcadores } =
          construirMarcadores();
        await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idPago,
            datosPaciente: { ...datos, edad: edadNum },
            marcadores,
            rodillaMarcadores,
            manoMarcadores,
            hombroMarcadores,
            codoMarcadores,
            tobilloMarcadores,
          }),
        });
      } catch {}
    } catch (err) {
      console.error("Preview IA error:", err);
      alert("Error al generar el preview de IA.");
    } finally {
      setGenerando(false);
    }
  };

  // ====== Checklist RM (modal local) ======
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

  // Abrir modal
  const lanzarChecklistRM = () => {
    if (!requiereRM) return;
    setShowRM(true);
  };

  // Guardado desde el modal
  const handleSaveRM = (form) => {
    // Aquí podrías activar bloqueos automáticos si lo decides (p.ej. marcapasos)
    setBloqueaRM(false);

    const resumen = construirResumenRM(form);
    setResonanciaChecklist(form);
    setResonanciaResumenTexto(resumen);

    // Persistimos local
    try {
      sessionStorage.setItem("resonanciaChecklist", JSON.stringify(form));
      sessionStorage.setItem("resonanciaResumenTexto", resumen);
    } catch {}

    // Persistimos en backend
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

  // ===== Pagar (IA)
  const handlePagarIA = async () => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    const base =
      saved ? JSON.parse(saved) : { ...datos, edad: Number(datos.edad) };

    const edadNum = Number(base.edad);
    if (
      !base.nombre?.trim() ||
      !base.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datos.consulta?.trim() ||
      !previewIA?.trim()
    ) {
      alert(
        "Completa nombre, RUT, edad (>0), genera el PREVIEW IA y luego realiza el pago."
      );
      return;
    }

    // Gate: si requiere RM y aún NO hay checklist ni bloqueo → pedirlo antes de pagar
    if (requiereRM && !resonanciaChecklist && !bloqueaRM) {
      alert("Antes de pagar, complete el checklist de RM (presione Continuar).");
      return;
    }

    try {
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "ia");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(base));

      // 💾 Persistir marcadores también antes de ir a pago
      try {
        const { marcadores, rodillaMarcadores, manoMarcadores, hombroMarcadores, codoMarcadores, tobilloMarcadores } =
          construirMarcadores();
        await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idPago,
            datosPaciente: base,
            marcadores,
            rodillaMarcadores,
            manoMarcadores,
            hombroMarcadores,
            codoMarcadores,
            tobilloMarcadores,
          }),
        });
      } catch {}

      await irAPagoKhipu({ ...base, edad: edadNum }, { idPago, modulo: "ia" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (IA):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  // ===== Descargar PDF IA (post-pago) — Informe de texto
  const handleDescargarIA = async () => {
    const id = sessionStorage.getItem("idPago") || idPago;
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

    let reinyectado = false;
    try {
      const maxIntentos = 30;
      for (let i = 1; i <= maxIntentos; i++) {
        const r = await intentaDescarga();
        if (r.ok) break;

        if (r.status === 402) {
          // pagoConfirmado aún no marcado en backend
          setMensajeDescarga(`Verificando pago… (${i}/${maxIntentos})`);
          // intenta marcar de nuevo el pago confirmado
          fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idPago: id }),
          }).catch(() => {});
          await sleep(1500);
          if (i === maxIntentos)
            alert("El pago aún no se confirma. Intenta nuevamente.");
          continue;
        }

        if (r.status === 404) {
          // backend reiniciado → reinyecta
          if (!reinyectado) {
            setMensajeDescarga("Restaurando datos de informe (preview IA) …");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo
              ? JSON.parse(respaldo)
              : { ...datos, edad: Number(datos.edad) || undefined };

            const consultaGuardada =
              sessionStorage.getItem("consultaIA") || datos.consulta || "";

            await fetch(`${BACKEND_BASE}/api/preview-informe`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago: id,
                consulta: consultaGuardada,
                nombre: datosReinyectar?.nombre,
                edad: Number(datosReinyectar?.edad) || undefined,
                rut: datosReinyectar?.rut,
                genero: datosReinyectar?.genero,
                dolor: datosReinyectar?.dolor,
                lado: datosReinyectar?.lado,
              }),
            });

            // 💾 reenviar marcadores
            try {
              const { marcadores, rodillaMarcadores, manoMarcadores, hombroMarcadores, codoMarcadores, tobilloMarcadores } =
                construirMarcadores();
              await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  idPago: id,
                  datosPaciente: datosReinyectar,
                  marcadores,
                  rodillaMarcadores,
                  manoMarcadores,
                  hombroMarcadores,
                  codoMarcadores,
                  tobilloMarcadores,
                }),
              });
            } catch {}

            // marcar pago confirmado nuevamente
            await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idPago: id }),
            });

            reinyectado = true;
            await sleep(600);
            continue;
          } else {
            alert("No se pudo descargar el PDF después de reintentar.");
            break;
          }
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  // ===== Descargar PDF Orden de Exámenes (post-pago)
  const handleDescargarOrdenIA = async () => {
    const id = sessionStorage.getItem("idPago") || idPago;
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
      if (!res.ok) throw new Error("Error al obtener el PDF de la orden");
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

    let reinyectado = false;
    try {
      const maxIntentos = 30;
      for (let i = 1; i <= maxIntentos; i++) {
        const r = await intentaDescarga();
        if (r.ok) break;

        if (r.status === 402) {
          setMensajeDescargaOrden(`Verificando pago… (${i}/${maxIntentos})`);
          // intenta marcar de nuevo el pago confirmado
          fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idPago: id }),
          }).catch(() => {});
          await sleep(1500);
          if (i === maxIntentos)
            alert("El pago aún no se confirma. Intenta nuevamente.");
          continue;
        }

        if (r.status === 404) {
          if (!reinyectado) {
            setMensajeDescargaOrden("Restaurando datos de informe (preview IA) …");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo
              ? JSON.parse(respaldo)
              : { ...datos, edad: Number(datos.edad) || undefined };

            const consultaGuardada =
              sessionStorage.getItem("consultaIA") || datos.consulta || "";

            await fetch(`${BACKEND_BASE}/api/preview-informe`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago: id,
                consulta: consultaGuardada,
                nombre: datosReinyectar?.nombre,
                edad: Number(datosReinyectar?.edad) || undefined,
                rut: datosReinyectar?.rut,
                genero: datosReinyectar?.genero,
                dolor: datosReinyectar?.dolor,
                lado: datosReinyectar?.lado,
              }),
            });

            // 💾 reenviar marcadores
            try {
              const { marcadores, rodillaMarcadores, manoMarcadores, hombroMarcadores, codoMarcadores, tobilloMarcadores } =
                construirMarcadores();
              await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  idPago: id,
                  datosPaciente: datosReinyectar,
                  marcadores,
                  rodillaMarcadores,
                  manoMarcadores,
                  hombroMarcadores,
                  codoMarcadores,
                  tobilloMarcadores,
                }),
              });
            } catch {}

            await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idPago: id }),
            });

            reinyectado = true;
            await sleep(600);
            continue;
          } else {
            alert("No se pudo descargar la orden después de reintentar.");
            break;
          }
        }

        alert("No se pudo descargar la orden.");
        break;
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo descargar la orden.");
    } finally {
      setDescargandoOrden(false);
      setMensajeDescargaOrden("");
    }
  };

  // ===== UI
  return (
    <div style={S.card}>
      {/* AVISO LEGAL (bloquea hasta aceptar) */}
      <AvisoLegal visible={mostrarAviso} persist={false} onAccept={continuarTrasAviso} onReject={rechazarAviso} />

      <h3 style={{ marginTop: 0, color: T.primaryDark || T.primary }}>
        Vista previa — Informe IA (texto libre)
      </h3>

      {/* Datos Paciente */}
      <div style={{ marginBottom: 10 }}>
        <div style={S.grid1}>
          <label style={S.label}>
            Nombre
            <input
              type="text"
              value={datos.nombre || ""}
              onChange={(e) =>
                setDatos((p) => ({ ...p, nombre: e.target.value }))
              }
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
              onChange={(e) =>
                setDatos((p) => ({ ...p, edad: e.target.value }))
              }
              placeholder="Edad"
              style={S.input}
            />
          </label>
        </div>
      </div>

      {/* Puntos marcados de mapeadores (todas las zonas con contenido) */}
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

      {/* Consulta Libre */}
      <div>
        <strong>Consulta / Indicaciones:</strong>
        <textarea
          rows={6}
          value={datos.consulta || ""}
          onChange={(e) =>
            setDatos((p) => ({ ...p, consulta: e.target.value }))
          }
          placeholder="Escribe aquí tus síntomas."
          style={S.textarea}
        />
        <button
          style={{ ...S.btnPrimary, marginTop: 12 }}
          onClick={handleGenerarPreview}
          disabled={generando}
          aria-busy={generando}
        >
          {generando ? "Generando preview…" : "Generar PREVIEW IA"}
        </button>
      </div>

      {/* Preview */}
      {previewIA && (
        <div style={{ marginTop: 14 }}>
          <strong>Preview generado:</strong>
          <pre style={S.pre}>{previewIA}</pre>
        </div>
      )}

      {/* Mensajes de estado RM */}
      {previewIA && requiereRM && !resonanciaChecklist && !bloqueaRM && (
        <div style={S.hint}>
          La IA sugiere Resonancia Magnética. Presione “Continuar” para completar el checklist de seguridad.
        </div>
      )}
      {previewIA && bloqueaRM && (
        <div style={S.hint}>
          RM contraindicada por checklist. {ordenAlternativa || "Se sugiere alternativa."}
        </div>
      )}

      {/* Controles de pago/descarga */}
      {!pagoRealizado && previewIA && (
        <>
          {/* Si requiere RM y aún no hay checklist ni bloqueo → CONTINUAR */}
          {requiereRM && !resonanciaChecklist && !bloqueaRM && (
            <button
              style={{ ...S.btnPrimary, marginTop: 12 }}
              onClick={lanzarChecklistRM}
            >
              Continuar
            </button>
          )}

          {/* Si NO requiere RM, o ya completó checklist, o quedó bloqueada → Pagar */}
          {(!requiereRM || resonanciaChecklist || bloqueaRM) && (
            <button
              style={{ ...S.btnPrimary, marginTop: 12 }}
              onClick={handlePagarIA}
            >
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
            aria-busy={descargando}
            title={mensajeDescarga || "Verificar y descargar"}
          >
            {descargando
              ? mensajeDescarga || "Verificando…"
              : "Descargar Informe IA"}
          </button>

          {/* Orden de Exámenes (IA) */}
          <button
            style={{ ...S.btnPrimary, marginTop: 8 }}
            onClick={handleDescargarOrdenIA}
            disabled={descargandoOrden}
            aria-busy={descargandoOrden}
            title={mensajeDescargaOrden || "Verificar y descargar"}
          >
            {descargandoOrden
              ? mensajeDescargaOrden || "Verificando…"
              : "Descargar Orden de Exámenes (IA)"}
          </button>
        </>
      )}

      {/* ===== Modal local del Formulario de Resonancia ===== */}
      {showRM && (
        <div
          style={S.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rm-title"
        >
          <div style={S.modalCard}>
            <h4 id="rm-title" style={{ margin: 8, color: T.primary }}>Checklist de Resonancia</h4>
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

/* ============================== UI (desde theme.json) ============================== */
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
    // 1 columna para que RUT/Edad no se salgan del panel lateral
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
    hint: { marginTop: 10, fontStyle: "italic", color: T.textMuted ?? "#666" },

    // Modal simple
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
