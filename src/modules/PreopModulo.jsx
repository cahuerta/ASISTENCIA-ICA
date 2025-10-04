// src/modules/PreopModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";

/* NUEVO: aviso legal (gating como en Generales) */
import AvisoLegal from "../components/AvisoLegal.jsx";

/* === SOLO paso "esquema" (sin mapper) === */
import EsquemaAnterior from "../EsquemaAnterior.jsx";
import EsquemaPosterior from "../EsquemaPosterior.jsx";
import EsquemaToggleTabs from "../EsquemaToggleTabs.jsx";

/* === Pasos "tipo" y "comorb" usando tus formularios === */
import FormularioTipoCirugia from "../FormularioTipoCirugia.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";

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

/* ===== Helper para el resumen inicial PREOP ===== */
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
  /* ===== Stepper interno =====
     esquema -> tipo -> comorb -> preview */
  const [fase, setFase] = useState("esquema");

  /* ===== Datos y estado original ===== */
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Paso previo: "Continuar" → IA → segundo preview → pago/descarga
  const [stepStarted, setStepStarted] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  // IA y metadatos
  const [examenesIA, setExamenesIA] = useState([]);
  const [informeIA, setInformeIA] = useState("");
  const [comorbilidades, setComorbilidades] = useState({});
  const [tipoCirugia, setTipoCirugia] = useState("");

  /* UI esquema (solo toggle) */
  const [vista, setVista] = useState("anterior");

  /* ===== NUEVO: gating por Aviso Legal ===== */
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    try { sessionStorage.setItem("preop_aviso_ok", "1"); } catch {}
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  useEffect(() => {
    // Aviso Legal → si no aceptó, mostrarlo
    const avisoOk = (() => {
      try { return sessionStorage.getItem("preop_aviso_ok") === "1"; } catch { return false; }
    })();
    if (!avisoOk) setMostrarAviso(true);

    // Datos paciente (para mostrar y persistir)
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

    // Comorbilidades
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

    // IA previa
    try {
      const ex = JSON.parse(sessionStorage.getItem("preop_ia_examenes") || "[]");
      const inf = sessionStorage.getItem("preop_ia_resumen") || "";
      setExamenesIA(Array.isArray(ex) ? ex : []);
      setInformeIA(inf);
      if ((Array.isArray(ex) && ex.length) || inf) {
        setStepStarted(true);
        setFase("preview");
      }
    } catch {}

    // Retorno de pago (pago ok)
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      setStepStarted(true);
      setFase("preview");
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
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

  /* ===== handler del esquema (SIN mapper) ===== */
  const onSeleccionZona = (zona) => {
    let dolor = "", lado = "";
    const zl = String(zona || "").toLowerCase();

    if (zl.includes("columna cervical")) { dolor = "Columna cervical"; lado = ""; }
    else if (zl.includes("columna dorsal")) { dolor = "Columna dorsal"; lado = ""; }
    else if (zl.includes("columna lumbar") || zl.includes("columna")) { dolor = "Columna lumbar"; lado = ""; }
    else if (zl.includes("cadera")) { dolor = "Cadera"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("rodilla")) { dolor = "Rodilla"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("hombro")) { dolor = "Hombro"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("codo")) { dolor = "Codo"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("mano")) { dolor = "Mano"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zl.includes("tobillo")) { dolor = "Tobillo"; lado = zl.includes("izquierda") ? "Izquierda" : "Derecha"; }

    const next = { ...datos, dolor, lado };
    setDatos(next);
    try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
  };

  /* ===== Continuar → IA y pasar al preview ===== */
  const handleContinuar = async () => {
    try {
      setLoadingIA(true);

      // refrescos defensivos
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
      setFase("preview");
    } catch (err) {
      console.error(err);
      alert("No fue posible obtener la información de IA (Preop). Intenta nuevamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  /* ===== Pago ===== */
  const handlePagarDesdePreview = async () => {
    const idPago =
      sessionStorage.getItem("idPago") ||
      `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");

    try {
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
      console.error("No se pudo generar el link de pago (preop):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  /* ===== Descargar PDF ===== */
  const handleDescargarPreop = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const intentaDescarga = async () => {
      let res = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, { cache: "no-store" });
      if (!res.ok) res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });

      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `preop_${baseName}.pdf`;
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
          await sleep(1500);
          if (i === maxIntentos) alert("El pago aún no se confirma. Intenta nuevamente.");
          continue;
        }

        if (r.status === 404) {
          if (!reinyectado) {
            setMensajeDescarga("Restaurando datos…");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datos;

            let r2 = await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: datosReinyectar,
                comorbilidades,
                tipoCirugia,
                examenesIA: Array.isArray(examenesIA) ? examenesIA : [],
                informeIA: informeIA || "",
              }),
            });
            if (!r2.ok) {
              await fetch(`${BACKEND_BASE}/guardar-datos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idPago, datosPaciente: datosReinyectar }),
              });
            }

            reinyectado = true;
            await sleep(500);
            continue;
          } else {
            alert("No se pudo descargar el PDF después de reintentar.");
            break;
          }
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  /* ===================== UI ===================== */
  const comorbChips = prettyComorb(comorbilidades);

  return (
    <div className="card" aria-live="polite">
      {/* NUEVO: Modal/overlay Aviso Legal */}
      <AvisoLegal visible={mostrarAviso} persist={false} onAccept={continuarTrasAviso} onReject={rechazarAviso} />

      <h3 className="h1" style={{ color: T.primary }}>Vista previa — Exámenes preoperatorios</h3>

      {/* ====== FASE 1: ESQUEMA (SIN mapper) ====== */}
      {fase === "esquema" && (
        <div className="card" style={{ marginTop: 8 }}>
          <EsquemaToggleTabs vista={vista} onChange={setVista} />
          {vista === "anterior" ? (
            <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
          ) : (
            <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />
          )}
          <div className="mt-8 muted">
            {datos?.dolor
              ? <>Zona: <strong>{datos.dolor}{datos.lado ? ` — ${datos.lado}` : ""}</strong></>
              : "Seleccione una zona del esquema para continuar"}
          </div>
          <div className="toolbar right mt-16">
            <button
              className="btn"
              disabled={!datos?.dolor}
              onClick={() => setFase("tipo")}
            >
              Continuar → Tipo de cirugía
            </button>
          </div>
        </div>
      )}

      {/* ====== FASE 2: TIPO DE CIRUGÍA ====== */}
      {fase === "tipo" && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section">
            <h2 className="h1" style={{ margin: 0 }}>Tipo de cirugía</h2>
            <div className="muted">
              {datos?.dolor
                ? <>Zona: <strong>{datos.dolor}{datos.lado ? ` — ${datos.lado}` : ""}</strong></>
                : "Seleccione una zona en el paso anterior"}
            </div>
          </div>
          <div className="divider" />
          <FormularioTipoCirugia
            datos={datos}
            onTipoCirugiaChange={() => {
              try {
                const fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
                const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
                const final = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
                setTipoCirugia(final || "");
              } catch {}
            }}
          />
          <div className="toolbar right mt-16">
            <button
              className="btn"
              onClick={() => {
                const fijo = (sessionStorage.getItem("preop_tipoCirugia") || "");
                const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "");
                const isOtro = fijo.trim().toUpperCase().startsWith("OTRO");
                const ok = (fijo && !isOtro) || (isOtro && (otro || "").trim());
                if (!ok) {
                  alert("Seleccione el tipo de cirugía o especifique 'OTRO'.");
                  return;
                }
                setFase("comorb");
              }}
            >
              Continuar → Comorbilidades
            </button>
          </div>
        </div>
      )}

      {/* ====== FASE 3: COMORBILIDADES ====== */}
      {fase === "comorb" && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section">
            <h2 className="h1" style={{ margin: 0 }}>Comorbilidades</h2>
            <div className="muted">Complete y guarde para continuar al preview.</div>
          </div>
          <div className="divider" />
          <FormularioComorbilidades
            initial={comorbilidades || {}}
            onSave={async (payload) => {
              try {
                sessionStorage.setItem("preop_comorbilidades_data", JSON.stringify(payload || {}));
                sessionStorage.setItem("preop_comorbilidades_ok", "1");
              } catch {}
              setComorbilidades(payload || {});
              await handleContinuar();
              setFase("preview");
            }}
            onCancel={() => { /* sin acción */ }}
          />
        </div>
      )}

      {/* ====== FASE 4: PREVIEW ====== */}
      {fase === "preview" && (
        <>
          <section style={{ marginBottom: 10 }}>
            <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
            <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
            <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
            <div><strong>Género:</strong> {datos?.genero || "—"}</div>
            <div>
              <strong>Motivo/Área:</strong>{" "}
              {`Dolor en ${(datos?.dolor || "")}${datos?.lado ? ` ${datos.lado}` : ""}`.trim() || "—"}
            </div>
            {tipoCirugia ? (
              <div><strong>Tipo de cirugía:</strong> {tipoCirugia}</div>
            ) : (
              <div className="muted">
                (El tipo de cirugía se toma del formulario principal de PREOP.)
              </div>
            )}
          </section>

          {/* Resumen inicial (si aún no se generó IA) */}
          {!stepStarted && (
            <>
              <div className="mono">{resumenInicialPreop({ datos, comorb: comorbilidades, tipoCirugia })}</div>
              <button
                className="btn fullw"
                style={{ marginTop: 10 }}
                onClick={handleContinuar}
                disabled={loadingIA}
                aria-busy={loadingIA}
              >
                {loadingIA ? "Generando con IA…" : "Continuar"}
              </button>
            </>
          )}

          {/* Después de Continuar: chips, lista IA e informe, y acciones */}
          {stepStarted && (
            <>
              {/* Comorbilidades (chips) */}
              {(() => {
                const chips = prettyComorb(comorbilidades);
                return chips.length > 0 ? (
                  <section className="mt-8">
                    <strong>Comorbilidades:</strong>
                    <div className="chips mt-6">
                      {chips.map((t, i) => (
                        <span key={`${t}-${i}`} className="chip">{t}</span>
                      ))}
                    </div>
                  </section>
                ) : null;
              })()}

              {/* PREVIEW (lista de IA si existe) */}
              {Array.isArray(examenesIA) && examenesIA.length > 0 ? (
                <section className="mt-12">
                  <strong>Exámenes a solicitar (IA):</strong>
                  <ul className="mt-6">
                    {examenesIA.map((e, idx) => (
                      <li key={`${typeof e === "string" ? e : e?.nombre || "item"}-${idx}`}>
                        {typeof e === "string" ? e : e?.nombre || JSON.stringify(e)}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <div className="muted mt-12">
                  (Aún no hay lista de exámenes. Pulsa “Generar con IA…” para que se ejecute y aparezcan aquí.)
                </div>
              )}

              {informeIA && (
                <section className="mt-8">
                  <strong>Informe IA (resumen):</strong>
                  <div className="mono mt-6">{informeIA}</div>
                </section>
              )}

              {/* Acciones */}
              {pagoRealizado ? (
                <button
                  className="btn fullw mt-12"
                  onClick={handleDescargarPreop}
                  disabled={descargando}
                  aria-busy={descargando}
                  title={mensajeDescarga || "Verificar y descargar"}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>
              ) : (
                <button
                  className="btn fullw mt-12"
                  onClick={handlePagarDesdePreview}
                >
                  Pagar ahora (Pre Op)
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
