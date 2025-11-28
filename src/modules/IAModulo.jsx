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
    // Restaurar datos básicos
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

    // Aviso legal
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

    // Retorno de pago (pago=ok en la URL)
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idFromURL = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idFromURL) {
      setPagoRealizado(true);

      // Avisar al backend que consolide los datos IA si falta algo
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

  /* ================== DETECCIÓN DE RM ================== */
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

  /* ================== GENERAR PREVIEW IA ================== */
  const handleGenerarPreview = async () => {
    const edadNum = Number(datos.edad);

    // LIMITADOR FUERTE DE DATOS BÁSICOS
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
      alert("Escribe tus síntomas / motivo de consulta en el cuadro de texto.");
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
      if (!j.ok) throw new Error(j.error || "No se pudo generar el preview");

      const resp = j.respuesta || "";
      if (!resp.trim()) {
        alert(
          "La IA no devolvió un informe válido. Intenta nuevamente o modifica el texto."
        );
        return;
      }

      setPreviewIA(resp);
      sessionStorage.setItem("previewIA", resp);

      window.scrollTo({ top: 0, behavior: "smooth" });

      // Detección de Resonancia Magnética
      const pideRM = await detectarRM(resp);
      setRequiereRM(!!pideRM);
      setBloqueaRM(false);
      setResonanciaChecklist(null);
      setResonanciaResumenTexto("");
      setOrdenAlternativa("");

      // Guardar datos mínimos en backend para generar PDF luego
      try {
        await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idPago,
            datosPaciente: { ...datos, edad: edadNum },
            informeIA: resp,
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

  /* ================== RESUMEN RM ================== */
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

  /* ================== PAGO — SOLO PREPARA Y SALTA A PANTALLA TRES ================== */
  const handlePagarIA = async () => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    const base = saved
      ? JSON.parse(saved)
      : { ...datos, edad: Number(datos.edad) };
    const edadNum = Number(base.edad);

    // LIMITADOR FUERTE: datos básicos
    if (
      !base.nombre?.trim() ||
      !base.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0
    ) {
      alert(
        "Faltan datos básicos del paciente (nombre, RUT, edad > 0). Vuelva atrás y complételos."
      );
      return;
    }

    // LIMITADOR FUERTE: debe existir un informe IA
    const previewGuardado =
      sessionStorage.getItem("previewIA") || previewIA || "";
    if (!previewGuardado.trim()) {
      alert(
        "Aún no hay un informe IA generado. Debes generar el PREVIEW antes de pasar a la pantalla de pago."
      );
      return;
    }

    // LIMITADOR RM: si la IA sugiere RM y no hay checklist, no se puede pagar
    if (requiereRM && !resonanciaChecklist && !bloqueaRM) {
      alert(
        "La IA sugiere Resonancia Magnética. Debes completar primero el checklist de seguridad antes de continuar al pago."
      );
      return;
    }

    try {
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "ia");
      sessionStorage.setItem("pantalla", "tres");
      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({ ...base, edad: edadNum })
      );

      // Notificar al backend que este idPago ya tiene todo listo
      try {
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
      } catch {}

      // Aquí NO se hace pago directo: solo saltamos a PantallaTres
      if (typeof onIrPantallaTres === "function") {
        onIrPantallaTres({
          ...base,
          edad: edadNum,
          idPago,
        });
      } else {
        alert(
          "No se encontró manejador para PantallaTres. Revisa la integración del módulo IA."
        );
      }
    } catch (err) {
      console.error("No se pudo preparar el pago (IA):", err);
      alert(`No se pudo preparar el pago.\n${err?.message || err}`);
    }
  };

  /* ================== DESCARGAS POST-PAGO ================== */
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
          setMensajeDescarga(`Verificando pago… (${i}/${maxIntentos})`);
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
            setMensajeDescarga("Restaurando datos del informe…");

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

            await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idPago: id }),
            });

            reinyectado = true;
            await sleep(600);
            continue;
          } else {
            alert("No fue posible descargar el PDF después de reintentar.");
            break;
          }
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

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

    let reinyectado = false;

    try {
      const maxIntentos = 30;

      for (let i = 1; i <= maxIntentos; i++) {
        const r = await intentaDescarga();
        if (r.ok) break;

        if (r.status === 402) {
          setMensajeDescargaOrden(`Verificando pago… (${i}/${maxIntentos})`);
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
            setMensajeDescargaOrden("Restaurando datos…");

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
    } catch (err) {
      console.error(err);
      alert("No se pudo descargar la orden.");
    } finally {
      setDescargandoOrden(false);
      setMensajeDescargaOrden("");
    }
  };

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

      {/* Datos básicos */}
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
              onChange={(e) =>
                setDatos((p) => ({ ...p, rut: e.target.value }))
              }
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

      {/* Texto libre de consulta */}
      <div>
        <strong>Consulta / Indicaciones:</strong>
        <textarea
          rows={6}
          value={datos.consulta || ""}
          onChange={(e) =>
            setDatos((p) => ({ ...p, consulta: e.target.value }))
          }
          placeholder="Escribe aquí tus síntomas o motivo de consulta."
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

      {/* Preview IA */}
      {previewIA && (
        <div style={{ marginTop: 14 }}>
          <strong>Preview generado:</strong>
          <pre style={S.pre}>{previewIA}</pre>
        </div>
      )}

      {/* Mensajes de RM */}
      {previewIA && requiereRM && !resonanciaChecklist && !bloqueaRM && (
        <div style={S.hint}>
          La IA sugiere Resonancia Magnética. Presiona “Continuar” para completar
          el checklist de seguridad.
        </div>
      )}

      {previewIA && bloqueaRM && (
        <div style={S.hint}>
          RM contraindicada.{" "}
          {ordenAlternativa || "Se sugiere alternativa de estudio."}
        </div>
      )}

      {/* Botones de pago desde IAModulo → solo prepara y salta a PantallaTres */}
      {!pagoRealizado && previewIA && (
        <>
          {requiereRM && !resonanciaChecklist && !bloqueaRM && (
            <button
              style={{ ...S.btnPrimary, marginTop: 12 }}
              onClick={lanzarChecklistRM}
            >
              Continuar
            </button>
          )}

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

      {/* Descargas post-pago (cuando el usuario vuelve con pago=ok) */}
      {pagoRealizado && (
        <>
          <button
            style={{ ...S.btnPrimary, marginTop: 12 }}
            onClick={handleDescargarIA}
            disabled={descargando}
            aria-busy={descargando}
            title={mensajeDescarga || "Verificar y descargar"}
          >
            {descargando ? mensajeDescarga : "Descargar Informe IA"}
          </button>

          <button
            style={{ ...S.btnPrimary, marginTop: 8 }}
            onClick={handleDescargarOrdenIA}
            disabled={descargandoOrden}
            aria-busy={descargandoOrden}
            title={mensajeDescargaOrden || "Verificar y descargar"}
          >
            {descargandoOrden
              ? mensajeDescargaOrden
              : "Descargar Orden de Exámenes (IA)"}
          </button>
        </>
      )}

      {/* Modal RM */}
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
