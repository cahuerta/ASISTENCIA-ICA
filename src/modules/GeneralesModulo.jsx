// src/modules/GeneralesModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";

import AvisoLegal from "../components/AvisoLegal.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";

import ModuloLayout from "../components/ModuloLayout.jsx";
import logoGenerales from "../assets/logo_generales.png";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

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

function ensureGeneralesIdPago() {
  let id = null;
  try {
    id = sessionStorage.getItem("idPago");
  } catch {
    id = null;
  }
  if (!id) {
    id = `generales_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    try {
      sessionStorage.setItem("idPago", id);
    } catch {}
  }
  return id;
}

function prettyComorb(c = {}) {
  try {
    const keys = Object.keys(c);
    if (!keys.length) return [];
    const bullets = [];
    for (const k of keys) {
      const v = c[k];
      const label = LABELS_COMORB[k] || k.replace(/_/g, " ");
      if (typeof v === "boolean") {
        if (v) bullets.push(label);
        continue;
      }
      if (typeof v === "object" && v !== null && (v.tiene || v.usa || v.detalle)) {
        let t = label;
        if (v.detalle) t += ` — ${v.detalle}`;
        bullets.push(t);
        continue;
      }
      if (typeof v === "string" && v.trim()) {
        bullets.push(`${label}: ${v.trim()}`);
      }
    }
    return bullets;
  } catch {
    return [];
  }
}

function sexoPalabra(genero = "") {
  const s = String(genero).toUpperCase();
  return s === "FEMENINO" ? "mujer" : "hombre";
}

function resumenInicialGenerales(datos = {}, comorb = {}) {
  const sexo = sexoPalabra(datos.genero);
  const edad = datos.edad ? `${datos.edad} años` : "";
  const lista = prettyComorb(comorb);
  const antecedentes = lista.length
    ? `con antecedentes de: ${lista.join(", ")}`
    : "sin comorbilidades relevantes registradas";
  return `${sexo} ${edad}, ${antecedentes}. Solicita exámenes para chequeo general.`;
}

export default function GeneralesModulo({ initialDatos, onIrPantallaTres }) {
  const T = getTheme();
  const styles = makeStyles(T);

  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  const [stepStarted, setStepStarted] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  const [examenesIA, setExamenesIA] = useState([]);
  ￼const [informeIA, setInformeIA] = useState("");
  const [comorbilidades, setComorbilidades] = useState({});

  const [examenLibre, setExamenLibre] = useState("");

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    let wasStep2 = false;
    try {
      wasStep2 = sessionStorage.getItem("generales_step") === "2";
    } catch {}

    if (wasStep2) {
      try {
        const ex = JSON.parse(sessionStorage.getItem("generales_ia_examenes") || "[]");
        const inf = sessionStorage.getItem("generales_ia_resumen") || "";

        setExamenesIA(Array.isArray(ex) ? ex : []);
        setInformeIA(inf);
        setStepStarted(true);
      } catch {}
    } else {
      setExamenesIA([]);
      setInformeIA("");
    }

    try {
      const c = JSON.parse(sessionStorage.getItem("generales_comorbilidades_data") || "{}");
      setComorbilidades(c || {});
    } catch {}

    const avisoOk = (() => {
      try {
        return sessionStorage.getItem("generales_aviso_ok") === "1";
      } catch {
        return false;
      }
    })();
    if (!avisoOk) {
      setMostrarAviso(true);
      return;
    }

    const comorbOk = (() => {
      try {
        return sessionStorage.getItem("generales_comorbilidades_ok") === "1";
      } catch {
        return false;
      }
    })();
    if (!comorbOk) setMostrarComorbilidades(true);

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");
    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      setStepStarted(true);

      try {
        sessionStorage.setItem("generales_step", "2");
      } catch {}

      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;

      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          const res = await fetch(`${BACKEND_BASE}/obtener-datos-generales/${idPago}`);
          if (res.ok) {
            const j = await res.json();

            if (Array.isArray(j.examenesIA)) setExamenesIA(j.examenesIA);
            if (typeof j.informeIA === "string") setInformeIA(j.informeIA);

            clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        } catch {}

        if (intentos >= 30 && pollerRef.current) {
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

  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    try {
      sessionStorage.setItem("generales_aviso_ok", "1");
    } catch {}

    try {
      const ok = sessionStorage.getItem("generales_comorbilidades_ok") === "1";
      if (!ok) setMostrarComorbilidades(true);
    } catch {
      setMostrarComorbilidades(true);
    }
  };

  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  const handleSaveComorbilidades = (payload) => {
    setComorbilidades(payload || {});
    setMostrarComorbilidades(false);
    try {
      sessionStorage.setItem("generales_comorbilidades_ok", "1");
      sessionStorage.setItem("generales_comorbilidades_data", JSON.stringify(payload || {}));
    } catch {}
  };

  const handlePagarGenerales = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0) {
      alert("Complete nombre, RUT y edad (>0) antes de pagar.");
      return;
    }
    if (!datos.genero) {
      alert("Seleccione el sexo.");
      return;
    }

    try {
      const idPago = ensureGeneralesIdPago();
      sessionStorage.setItem("modulo", "generales");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));
      sessionStorage.setItem("pantalla", "tres");

      const examenPaciente = (examenLibre || "").trim();
      const examenesFinales = [
        ...(Array.isArray(examenesIA) ? examenesIA : []),
        ...(examenPaciente ? [examenPaciente] : []),
      ];

      await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
          comorbilidades,
          examenesIA: examenesFinales,
          informeIA,
          examenLibre: examenPaciente,
        }),
      });

      if (typeof onIrPantallaTres === "function") {
        sessionStorage.setItem("idPago", idPago);
        onIrPantallaTres({ ...datos, edad: edadNum, idPago });
      } else {
        await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "generales" });
      }
    } catch (err) {
      alert("No se pudo preparar el pago.");
    }
  };

  const handleDescargarGenerales = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf-generales/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generales_${(datos?.nombre || "paciente").replace(/ /g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { ok: true };
    };

    setDescargando(true);
    setMensajeDescarga("Verificando pago…");

    let reinyectado = false;

    try {
      for (let i = 1; i <= 30; i++) {
        const r = await intentaDescarga();
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
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datos;

            await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: datosReinyectar,
                comorbilidades,
                examenesIA: [
                  ...(Array.isArray(examenesIA) ? examenesIA : []),
                  ...((examenLibre || "").trim() ? [examenLibre.trim()] : []),
                ],
                informeIA,
                examenLibre: (examenLibre || "").trim(),
              }),
            });

            reinyectado = true;
            await sleep(500);
            continue;
          } else {
            alert("No se pudo descargar el PDF.");
            break;
          }
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  const handleContinuar = async () => {
    try {
      setLoadingIA(true);

      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));

      let c = {};
      try {
        c = JSON.parse(sessionStorage.getItem("generales_comorbilidades_data") || "{}");
      } catch {}
      setComorbilidades(c || {});

      const idPago = ensureGeneralesIdPago();
      sessionStorage.setItem("idPago", idPago);

      const body = {
        idPago,
        paciente: { ...datos, edad: Number(datos.edad) || datos.edad },
        comorbilidades: c || {},
      };

      let resp = await fetch(`${BACKEND_BASE}/ia-generales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok)
        resp = await fetch(`${BACKEND_BASE}/preop-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });

      if (!resp.ok)
        resp = await fetch(`${BACKEND_BASE}/ia-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const j = await resp.json();

      // 🔥 CAMBIO APLICADO AQUÍ
      const ex = Array.isArray(j?.examenesIA) ? j.examenesIA : [];
      const inf = typeof j?.informeIA === "string" ? j.informeIA : "";

      sessionStorage.setItem("generales_ia_examenes", JSON.stringify(ex));
      sessionStorage.setItem("generales_ia_resumen", inf || "");
      sessionStorage.setItem("generales_step", "2");

      setExamenesIA(ex);
      setInformeIA(inf);
      setStepStarted(true);
    } catch (e) {
      alert("No fue posible obtener IA (Generales).");
    } finally {
      setLoadingIA(false);
    }
  };

  const subtitleLayout = stepStarted
    ? "Revise la propuesta de exámenes, agregue un examen opcional y continúe al pago."
    : "Indique enfermedades previas para generar la propuesta de exámenes.";

  return (
    <ModuloLayout logo={logoGenerales} title="Asistente Generales" subtitle={subtitleLayout} variant="generales">
      <div className="card" style={styles.card}>
        <AvisoLegal visible={mostrarAviso} persist={false} onAccept={continuarTrasAviso} onReject={rechazarAviso} />

        {mostrarComorbilidades && (
          <div style={styles.modalOverlay}>
            <div className="card" style={{ width: "min(900px, 96vw)" }}>
              <FormularioComorbilidades
                initial={comorbilidades || {}}
                onSave={handleSaveComorbilidades}
                onCancel={() => setMostrarComorbilidades(false)}
              />
            </div>
          </div>
        )}

        <h3 style={{ marginTop: 0, color: T.primaryDark || T.primary }}>
          {stepStarted
            ? "Revise la propuesta de exámenes y agregue un examen opcional si lo requiere."
            : "Seleccione enfermedades previas."}
        </h3>

        <div style={{ marginBottom: 10 }}>
          <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
          <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
          <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
          <div><strong>Sexo:</strong> {datos?.genero || "—"}</div>
        </div>

        {!stepStarted && !mostrarComorbilidades && (
          <>
            <div style={{ ...styles.mono, marginTop: 6 }}>
              {resumenInicialGenerales(datos, comorbilidades)}
            </div>

            <button className="btn" style={styles.btnPrimary} onClick={handleContinuar} disabled={loadingIA}>
              {loadingIA ? "Generando con IA…" : "Continuar"}
            </button>
          </>
        )}

        {stepStarted && (
          <>
            {prettyComorb(comorbilidades).length > 0 && (
              <div style={styles.block}>
                <strong>Comorbilidades:</strong>
                <div style={{ marginTop: 6 }}>
                  {prettyComorb(comorbilidades).map((t, i) => (
                    <span key={i} style={styles.tag}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.block}>
              <strong>Exámenes solicitados (IA):</strong>
              {Array.isArray(examenesIA) && examenesIA.length > 0 ? (
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {examenesIA.map((e, idx) => (
                    <li key={`${e}-${idx}`}>{e}</li>
                  ))}
                </ul>
              ) : (
                <div style={styles.hint}>Aún no hay lista generada por IA.</div>
              )}
            </div>

            <div style={styles.block}>
              <label><strong>Agregar examen opcional:</strong></label>
              <input
                type="text"
                value={examenLibre}
                onChange={(e) => setExamenLibre(e.target.value)}
                placeholder="Ej.: Densitometría ósea"
                style={styles.input}
              />
            </div>

            {informeIA && (
              <div style={styles.block}>
                <strong>Informe IA (resumen):</strong>
                <div style={{ marginTop: 6, ...styles.mono }}>{informeIA}</div>
              </div>
            )}

            {!pagoRealizado ? (
              <button className="btn" style={{ ...styles.btnPrimary, marginTop: 12 }} onClick={handlePagarGenerales}>
                Pagar ahora (Generales)
              </button>
            ) : (
              <button
                className="btn"
                style={{ ...styles.btnPrimary, marginTop: 12 }}
                onClick={handleDescargarGenerales}
                disabled={descargando}
                aria-busy={descargando}
                title={mensajeDescarga || "Verificar y descargar"}
              >
                {descargando ? mensajeDescarga || "Verificando…" : "Descargar Documento"}
              </button>
            )}
          </>
        )}
      </div>
    </ModuloLayout>
  );
}

function makeStyles(T) {
  return {
    card: {
      background: "var(--surface, #fff)",
      borderRadius: 12,
      padding: 16,
      boxShadow: "var(--shadow-sm, 0 2px 10px rgba(0,0,0,0.08))",
      border: "1px solid var(--border, #e8e8e8)",
      color: "var(--text, #1b1b1b)",
      position: "relative",
      zIndex: 0,
    },
    btnPrimary: {
      backgroundColor: "var(--primary, #0072CE)",
      color: "var(--on-primary, #fff)",
      border: "1px solid var(--primary, #0072CE)",
      padding: "12px",
      borderRadius: 8,
      fontSize: 16,
      cursor: "pointer",
      width: "100%",
      boxShadow: "var(--shadow-sm, 0 1px 4px rgba(0,0,0,0.08))",
    },
    block: { marginTop: 12 },
    mono: {
      whiteSpace: "pre-wrap",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      background: "var(--code-bg, #f7f7f7)",
      borderRadius: 8,
      padding: 10,
      fontSize: 13,
      lineHeight: 1.45,
      border: "1px solid var(--border, #eee)",
      color: "var(--text, #1b1b1b)",
    },
    hint: {
      marginTop: 6,
      fontStyle: "italic",
      color: "var(--text-muted, #666)",
    },
    tag: {
      display: "inline-block",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 12,
      background: "var(--chip-bg, #eef6ff)",
      border: "1px solid var(--chip-border, #cfe4ff)",
      color: "var(--chip-text, #0b63c5)",
      marginRight: 6,
      marginBottom: 6,
    },
    input: {
      width: "100%",
      borderRadius: 8,
      border: "1px solid var(--border, #e8e8e8)",
      padding: "10px 12px",
      background: "var(--bg, #fff)",
      color: "var(--text, #1b1b1b)",
      marginTop: 6,
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: T.overlay || "rgba(0,0,0,.35)",
      display: "grid",
      placeItems: "center",
      zIndex: 2147483000,
      padding: 12,
    },
  };
}
