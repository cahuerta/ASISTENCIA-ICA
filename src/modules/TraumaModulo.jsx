// src/modules/TraumaModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ================= Helpers ================= */
function ensureTraumaIdPago() {
  let id = sessionStorage.getItem("idPago");
  if (!id || !/^pago_|^trauma_/.test(id)) {
    id = `trauma_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", id);
  }
  return id;
}

function sexoPalabra(genero = "") {
  const s = String(genero).toUpperCase();
  return s === "FEMENINO" ? "mujer" : "hombre";
}

function resumenInicialTrauma(datos = {}) {
  const sexo = sexoPalabra(datos.genero);
  const edad = datos.edad ? `${datos.edad} años` : "";
  const zona =
    datos?.dolor
      ? `Dolor de ${datos.dolor}${datos?.lado ? " " + datos.lado : ""}`
      : "Motivo no especificado";
  return `${sexo} ${edad}. ${zona}. Se solicita evaluación imagenológica según clínica.`;
}

/* ================= Componente ================= */
export default function TraumaModulo({ initialDatos }) {
  const T = getTheme();
  const S = makeStyles(T);

  const [datos, setDatos] = useState(initialDatos || {});
  const [stepStarted, setStepStarted] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  const [examenesIA, setExamenesIA] = useState([]);
  const [diagnosticoIA, setDiagnosticoIA] = useState("");
  const [justificacionIA, setJustificacionIA] = useState("");

  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Restaurar estado
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    try {
      const ex = JSON.parse(sessionStorage.getItem("trauma_ia_examenes") || "[]");
      setExamenesIA(Array.isArray(ex) ? ex : []);
      setDiagnosticoIA(sessionStorage.getItem("trauma_ia_diagnostico") || "");
      setJustificacionIA(sessionStorage.getItem("trauma_ia_justificacion") || "");
      if (ex && ex.length) setStepStarted(true);
    } catch {}

    // retorno de pago
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");
    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos/${idPago}`);
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

  /* -------- IA -------- */
  const handleContinuar = async () => {
    try {
      setLoadingIA(true);

      // refresco defensivo
      try {
        const saved = sessionStorage.getItem("datosPacienteJSON");
        if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}

      const idPago = ensureTraumaIdPago();
      sessionStorage.setItem("modulo", "trauma");

      const edadNum = Number(datos.edad) || datos.edad;
      const body = {
        idPago,
        paciente: {
          ...datos,
          edad: edadNum,
        },
      };

      const resp = await fetch(`${BACKEND_BASE}/ia-trauma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const j = await resp.json();
      const ex = Array.isArray(j?.examenes) ? j.examenes.slice(0, 4) : [];
      const dx = typeof j?.diagnostico === "string" ? j.diagnostico : "";
      const just = typeof j?.justificacion === "string" ? j.justificacion : j?.resumen || "";

      // Persistimos para PDF / retorno
      try {
        sessionStorage.setItem("trauma_ia_examenes", JSON.stringify(ex));
        sessionStorage.setItem("trauma_ia_diagnostico", dx || "");
        sessionStorage.setItem("trauma_ia_justificacion", just || "");
      } catch {}

      setExamenesIA(ex);
      setDiagnosticoIA(dx);
      setJustificacionIA(just);
      setStepStarted(true);
    } catch (e) {
      alert("No fue posible obtener la información de IA (Trauma). Intenta nuevamente.");
    } finally {
      setLoadingIA(false);
    }
  };

  /* -------- Pago -------- */
  const handlePagar = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datos.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return;
    }

    try {
      const idPago = ensureTraumaIdPago();
      sessionStorage.setItem("modulo", "trauma");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      // Guardar datos + IA para que el PDF quede consistente
      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: {
            ...datos,
            edad: edadNum,
            examenesIA,
            diagnosticoIA,
            justificacionIA,
          },
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "trauma" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (trauma):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  /* -------- Descargar PDF -------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const handleDescargar = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `orden_${baseName}.pdf`;
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

            await fetch(`${BACKEND_BASE}/guardar-datos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: {
                  ...datosReinyectar,
                  examenesIA,
                  diagnosticoIA,
                  justificacionIA,
                },
              }),
            });

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

  /* -------- UI -------- */
  const usarIA = Array.isArray(examenesIA) && examenesIA.length > 0;

  return (
    <div style={S.card}>
      <h3 style={{ marginTop: 0, color: T.primaryDark || T.primary }}>
        Vista previa — Imagenología
      </h3>

      <div style={{ marginBottom: 10 }}>
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div><strong>Género:</strong> {datos?.genero || "—"}</div>
        <div><strong>Dolor:</strong> {datos?.dolor || "—"}</div>
        <div><strong>Lado:</strong> {datos?.lado || "—"}</div>
      </div>

      {/* Primer preview: resumen plano */}
      {!stepStarted && (
        <>
          <div style={{ ...S.mono, marginTop: 6 }}>{resumenInicialTrauma(datos)}</div>
          <button style={S.btnPrimary} onClick={handleContinuar} disabled={loadingIA}>
            {loadingIA ? "Analizando con IA…" : "Continuar"}
          </button>
        </>
      )}

      {/* Segundo preview: IA + pago */}
      {stepStarted && (
        <>
          <div style={S.block}>
            <strong>Diagnóstico presuntivo:</strong>
            <div style={{ ...S.mono, marginTop: 6 }}>{diagnosticoIA || "—"}</div>
          </div>

          <div style={S.block}>
            <strong>Exámenes sugeridos (IA):</strong>
            {usarIA ? (
              <ul style={{ marginTop: 6 }}>
                {examenesIA.map((e, i) => (
                  <li key={`${e}-${i}`}>{e}</li>
                ))}
              </ul>
            ) : (
              <div style={S.hint}>Aún no hay lista generada por IA.</div>
            )}
          </div>

          {justificacionIA && (
            <div style={S.block}>
              <strong>Justificación (≈100 palabras):</strong>
              <div style={{ ...S.mono, marginTop: 6 }}>{justificacionIA}</div>
            </div>
          )}

          {!pagoRealizado ? (
            <>
              <button style={{ ...S.btnPrimary, marginTop: 12 }} onClick={handlePagar}>
                Pagar ahora (Trauma)
              </button>
              <button
                style={{ ...S.btnSecondary, marginTop: 8 }}
                title="Simular retorno pagado (solo pruebas)"
                onClick={async () => {
                  const idPago = `trauma_guest_${Date.now()}`;
                  const datosGuest = {
                    nombre: "Guest",
                    rut: "99999999-9",
                    edad: 35,
                    genero: "MASCULINO",
                    dolor: "Rodilla",
                    lado: "Izquierda",
                  };

                  sessionStorage.setItem("idPago", idPago);
                  sessionStorage.setItem("modulo", "trauma");
                  sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datosGuest));

                  await fetch(`${BACKEND_BASE}/guardar-datos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      idPago,
                      datosPaciente: {
                        ...datosGuest,
                        examenesIA,
                        diagnosticoIA,
                        justificacionIA,
                      },
                    }),
                  });

                  const url = new URL(window.location.href);
                  url.searchParams.set("pago", "ok");
                  url.searchParams.set("idPago", idPago);
                  window.location.href = url.toString();
                }}
              >
                Simular Pago (Guest)
              </button>
            </>
          ) : (
            <button
              style={{ ...S.btnPrimary, marginTop: 12 }}
              onClick={handleDescargar}
              disabled={descargando}
              title={mensajeDescarga || "Verificar y descargar"}
            >
              {descargando ? mensajeDescarga || "Verificando…" : "Descargar Documento"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* =============== Estilos (desde theme.json) =============== */
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
    btnSecondary: {
      backgroundColor: T.muted ?? "#777",
      color: T.onMuted ?? "#fff",
      border: "none",
      padding: "12px",
      borderRadius: 8,
      fontSize: 16,
      cursor: "pointer",
      width: "100%",
      boxShadow: T.shadowSm ?? "0 1px 4px rgba(0,0,0,0.08)",
    },
    block: { marginTop: 12 },
    mono: {
      whiteSpace: "pre-wrap",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      background: T.codeBg ?? "#f7f7f7",
      borderRadius: 8,
      padding: 10,
      fontSize: 13,
      lineHeight: 1.45,
      border: `1px solid ${T.border ?? "#eee"}`,
      color: T.text ?? "#1b1b1b",
    },
    hint: { marginTop: 6, fontStyle: "italic", color: T.textMuted ?? "#666" },
  };
}
