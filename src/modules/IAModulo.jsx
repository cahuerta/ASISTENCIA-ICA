// src/modules/IAModulo.jsx
"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";
import AvisoLegal from "../components/AvisoLegal.jsx";
import FormularioResonancia from "../components/FormularioResonancia.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

export default function IAModulo({ initialDatos, onIrPantallaTres }) {
  const T = getTheme();
  const S = makeStyles(T);

  // ===== Estado base =====
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

  // ===== RM =====
  const [requiereRM, setRequiereRM] = useState(false);
  const [bloqueaRM, setBloqueaRM] = useState(false);
  const [resonanciaChecklist, setResonanciaChecklist] = useState(null);
  const [resonanciaResumenTexto, setResonanciaResumenTexto] = useState("");
  const [ordenAlternativa, setOrdenAlternativa] = useState("");
  const [showRM, setShowRM] = useState(false);

  // Aviso legal
  const [mostrarAviso, setMostrarAviso] = useState(false);

  // Pago
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const [descargandoOrden, setDescargandoOrden] = useState(false);
  const [mensajeDescargaOrden, setMensajeDescargaOrden] = useState("");
  const pollerRef = useRef(null);

  // ID PAGO
  const [idPago, setIdPago] = useState(() => {
    return (
      sessionStorage.getItem("idPago") ||
      "ia_" + Date.now() + "_" + Math.floor(Math.random() * 10000)
    );
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ===============================================================
  //   MARCADORES
  // ===============================================================

  const zonasSoportadas = ["rodilla", "mano", "hombro", "codo", "tobillo"];
  const capitalizar = (s = "") =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const leerResumenZona = useCallback(
    (zona) => {
      try {
        const data = JSON.parse(sessionStorage.getItem(`${zona}_data`) || "null");
        const lado = data?.lado || datos?.lado || "";
        const extra = JSON.parse(
          sessionStorage.getItem(`${zona}_seccionesExtra`) || "null"
        );

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

  const construirMarcadores = useCallback(() => {
    const marcadores = {};
    const porCompat = {};

    zonasSoportadas.forEach((z) => {
      try {
        const data = JSON.parse(sessionStorage.getItem(`${z}_data`) || "null");
        const extra = JSON.parse(
          sessionStorage.getItem(`${z}_seccionesExtra`) || "null"
        );
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
    const list = [];
    zonasSoportadas.forEach((z) => {
      const sec = leerResumenZona(z);
      if (sec?.lines?.length) list.push(sec);
    });
    return list;
  }, [leerResumenZona, previewIA, resonanciaChecklist, showRM]);

  // ===============================================================
  //   MONTAJE
  // ===============================================================

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((p) => ({ ...p, ...JSON.parse(saved) }));

      const savedIA = sessionStorage.getItem("consultaIA");
      if (savedIA) setDatos((p) => ({ ...p, consulta: savedIA }));

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

    const sp = new URLSearchParams(window.location.search);
    const pago = sp.get("pago");
    const idFromURL = sp.get("idPago") || sessionStorage.getItem("idPago");

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
    try {
      sessionStorage.setItem("ia_aviso_ok", "1");
    } catch {}
  };

  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  // ===============================================================
  //   PREVIEW
  // ===============================================================

  const normaliza = (t = "") =>
    String(t).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const contieneRMlocal = (texto = "") => {
    const s = normaliza(texto);
    if (!s) return false;

    const frases = [
      "resonancia magnetica",
      "resonancia nuclear",
      "magnetic resonance",
    ];
    if (frases.some((p) => s.includes(p))) return true;

    const re = [/\brm\b/i, /\bmri\b/i, /\birm\b/i];
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
        if (typeof j.resonancia === "boolean") return j.resonancia;
        return contieneRMlocal(j?.texto || examenTexto);
      }
    } catch {}

    return contieneRMlocal(examenTexto);
  };

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
      alert("Escribe tus síntomas.");
      return;
    }

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
          genero: datos.genero,
          dolor: datos.dolor,
          lado: datos.lado,
        }),
      });

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Error en IA");

      const resp = j.respuesta || "";
      setPreviewIA(resp);
      sessionStorage.setItem("previewIA", resp);

      window.scrollTo({ top: 0, behavior: "smooth" });

      const pideRM = await detectarRM(resp);
      setRequiereRM(!!pideRM);
      setBloqueaRM(false);
      setResonanciaChecklist(null);
      setResonanciaResumenTexto("");
      setOrdenAlternativa("");

      const {
        marcadores,
        rodillaMarcadores,
        manoMarcadores,
        hombroMarcadores,
        codoMarcadores,
        tobilloMarcadores,
      } = construirMarcadores();

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
    } catch (err) {
      console.error(err);
      alert("Error al generar el informe.");
    } finally {
      setGenerando(false);
    }
  };

  // ===============================================================
  //   RM
  // ===============================================================

  const construirResumenRM = (f = {}) => {
    const labels = {
      marcapasos: "Marcapasos/DAI",
      coclear_o_neuro: "Implante coclear/neuroestimulador",
      clips_aneurisma: "Clips de aneurisma",
      valvula_cardiaca_metal: "Implante metálico intracraneal",
      fragmentos_metalicos: "Fragmentos metálicos/balas",
      protesis_placas_tornillos: "Prótesis/placas/tornillos",
      cirugia_reciente_3m: "Cirugía reciente (<3m)",
      embarazo: "Embarazo/sospecha",
      claustrofobia: "Claustrofobia",
      peso_mayor_150: "Peso >150 kg",
      no_permanece_inmovil: "Dificultad inmovilidad",
      tatuajes_recientes: "Tatuajes/PMU < 6 semanas",
      piercings_no_removibles: "Piercings no removibles",
      bomba_insulina_u_otro: "Dispositivo externo activo",
      requiere_contraste: "Requiere contraste",
      erc_o_egfr_bajo: "eGFR < 30",
      alergia_gadolinio: "Alergia a gadolinio",
      reaccion_contrastes: "Reacción previa a contrastes",
      requiere_sedacion: "Requiere sedación",
      ayuno_6h: "Ayuno 6h",
    };

    const marcadas = Object.keys(labels)
      .filter((k) => f[k])
      .map((k) => `• ${labels[k]}`);

    const obs = (f.observaciones || "").trim();

    return [
      marcadas.length ? marcadas.join("\n") : "• Ninguna alerta marcada.",
      obs ? `Observaciones: ${obs}` : "",
    ]
      .filter(Boolean)
      .join("\n");
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

    sessionStorage.setItem("resonanciaChecklist", JSON.stringify(form));
    sessionStorage.setItem("resonanciaResumenTexto", resumen);

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

  // ===============================================================
  //   PAGO (SECUENCIA CORRECTA)
  // ===============================================================

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
      edadNum <= 0 ||
      !datos.consulta?.trim() ||
      !previewIA?.trim()
    ) {
      alert("Completa todos los datos.");
      return;
    }

    if (requiereRM && !resonanciaChecklist && !bloqueaRM) {
      alert("Completa el checklist de RM.");
      return;
    }

    try {
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "ia");

      // *** Línea que NO querías eliminar ***
      sessionStorage.setItem("pantalla", "tres");

      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({ ...base, edad: edadNum })
      );

      const {
        marcadores,
        rodillaMarcadores,
        manoMarcadores,
        hombroMarcadores,
        codoMarcadores,
        tobilloMarcadores,
      } = construirMarcadores();

      await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...base, edad: edadNum },
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

      onIrPantallaTres({
        ...base,
        edad: edadNum,
        idPago,
      });
    } catch (err) {
      console.error("No se pudo preparar el pago:", err);
      alert("No se pudo preparar el pago.");
    }
  };

  // ===============================================================
  //   DESCARGAR PDFs
  // ===============================================================

  const handleDescargarIA = async () => {
    const id = sessionStorage.getItem("idPago") || idPago;
    if (!id) {
      alert("ID de pago no encontrado.");
      return;
    }

    const intenta = async () => {
      const r = await fetch(`${BACKEND_BASE}/api/pdf-ia/${id}`, {
        cache: "no-store",
      });

      if (r.status === 404) return { ok: false, status: 404 };
      if (r.status === 402) return { ok: false, status: 402 };
      if (!r.ok) throw new Error();

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `informeIA_${(datos?.nombre || "paciente").replace(
        / /g,
        "_"
      )}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      return { ok: true };
    };

    setDescargando(true);
    setMensajeDescarga("Verificando pago…");

    let reinyectado = false;

    for (let i = 1; i <= 30; i++) {
      const r = await intenta();
      if (r.ok) break;

      if (r.status === 402) {
        setMensajeDescarga(`Verificando pago… (${i}/30)`);
        await sleep(1500);
        continue;
      }

      if (r.status === 404) {
        if (!reinyectado) {
          setMensajeDescarga("Restaurando datos…");

          const respaldo = sessionStorage.getItem("datosPacienteJSON");
          const datosReinyectar = respaldo
            ? JSON.parse(respaldo)
            : datos;

          await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              datosPaciente: datosReinyectar,
            }),
          });

          reinyectado = true;
          await sleep(600);
          continue;
        } else {
          alert("No fue posible generar el PDF.");
          break;
        }
      }
    }

    setDescargando(false);
    setMensajeDescarga("");
  };

  const handleDescargarOrdenIA = async () => {
    const id = sessionStorage.getItem("idPago") || idPago;
    if (!id) {
      alert("ID de pago no encontrado.");
      return;
    }

    const intenta = async () => {
      const r = await fetch(`${BACKEND_BASE}/api/pdf-ia-orden/${id}`, {
        cache: "no-store",
      });

      if (r.status === 404) return { ok: false, status: 404 };
      if (r.status === 402) return { ok: false, status: 402 };
      if (!r.ok) throw new Error();

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ordenIA_${(datos?.nombre || "paciente").replace(
        / /g,
        "_"
      )}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      return { ok: true };
    };

    setDescargandoOrden(true);
    setMensajeDescargaOrden("Verificando pago…");

    let reinyectado = false;

    for (let i = 1; i <= 30; i++) {
      const r = await intenta();
      if (r.ok) break;

      if (r.status === 402) {
        setMensajeDescargaOrden(`Verificando pago… (${i}/30)`);
        await sleep(1500);
        continue;
      }

      if (r.status === 404) {
        if (!reinyectado) {
          setMensajeDescargaOrden("Restaurando datos…");

          const respaldo = sessionStorage.getItem("datosPacienteJSON");
          const datosReinyectar = respaldo
            ? JSON.parse(respaldo)
            : datos;

          await fetch(`${BACKEND_BASE}/api/guardar-datos-ia`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              datosPaciente: datosReinyectar,
            }),
          });

          reinyectado = true;
          await sleep(600);
          continue;
        } else {
          alert("No fue posible generar el PDF.");
          break;
        }
      }
    }

    setDescargandoOrden(false);
    setMensajeDescargaOrden("");
  };

  // ===============================================================
  //   RENDER
  // ===============================================================

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

      {/* DATOS PACIENTE */}
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

      {/* MARCADORES */}
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

      {/* CONSULTA */}
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

      {/* PREVIEW */}
      {previewIA && (
        <div style={{ marginTop: 14 }}>
          <strong>Preview generado:</strong>
          <pre style={S.pre}>{previewIA}</pre>
        </div>
      )}

      {/* CHECKLIST RM INFO */}
      {previewIA && requiereRM && !resonanciaChecklist && !bloqueaRM && (
        <div style={S.hint}>
          La IA sugiere Resonancia Magnética. Presione “Continuar”.
        </div>
      )}

      {previewIA && bloqueaRM && (
        <div style={S.hint}>
          RM contraindicada.{" "}
          {ordenAlternativa || "Se sugiere alternativa."}
        </div>
      )}

      {/* PAGO */}
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

      {/* DESCARGAS */}
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

      {/* MODAL RM */}
      {showRM && (
        <div style={S.modalBackdrop} role="dialog" aria-modal="true">
          <div style={S.modalCard}>
            <h4 style={{ margin: 8, color: T.primary }}>
              Checklist de Resonancia
            </h4>
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

/* ============================== UI ============================== */
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
