"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";
import { getTheme } from "../theme.js";

const T = getTheme();
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

// Opciones de cirugía (mantenemos nombres para compatibilidad)
const TIPOS_CIRUGIA = [
  "Artroplastia total de cadera (ATC)",
  "Artroplastia total de rodilla (ATR)",
  "Artroscopia de rodilla",
  "Osteotomía (cadera/rodilla)",
  "Cirugía menor de partes blandas",
  "Otro (especificar)",
];

export default function PreopModulo({ initialDatos }) {
  // ===== Estados base existentes
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // ===== Estados del flujo
  // pasos: 'idle' | 'comorbilidades' | 'cirugia' | 'ia_cargando' | 'preview'
  const [paso, setPaso] = useState("idle");

  const [comorbilidades, setComorbilidades] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      const raw = idPago ? sessionStorage.getItem(`preop_comorbilidades_${idPago}`) : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  // Tipo de cirugía (lee preferencia guardada por FormularioPaciente)
  const [tipoCirugia, setTipoCirugia] = useState(() => {
    try {
      const preset = sessionStorage.getItem("preop_tipoCirugia") || "";
      const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      if (preset && preset.startsWith("Otro") && otro.trim()) return otro.trim();
      return preset || "";
    } catch { return ""; }
  });
  const [tipoCirugiaLibre, setTipoCirugiaLibre] = useState("");

  // Salida IA (solo lo que venga del backend)
  const [examenesIA, setExamenesIA] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      const raw = idPago ? sessionStorage.getItem(`preop_examenes_IA_${idPago}`) : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [informeIA, setInformeIA] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      return idPago ? sessionStorage.getItem(`preop_informe_IA_${idPago}`) || "" : "";
    } catch { return ""; }
  });

  // ===== Montaje: sincroniza datos y detecta retorno de pago
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("idPago");

    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try { await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`); } catch {}
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

  // ========= Paso 0: Continuar (abre Comorbilidades)
  const handleContinuarPreop = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) || edadNum <= 0 ||
      !datos.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de continuar.");
      return;
    }

    const idPago =
      sessionStorage.getItem("idPago") ||
      ("preop_" + Date.now() + "_" + Math.floor(Math.random() * 10000));

    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, datosPaciente: { ...datos, edad: edadNum } }),
      });
    } catch {}

    setPaso("comorbilidades");
  };

  // ========= Paso 1: Recibir Comorbilidades (tu formulario)
  const handleEnviarComorbilidades = async (formData) => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const limpio = normalizarComorbilidades(formData);
    setComorbilidades(limpio);
    sessionStorage.setItem(`preop_comorbilidades_${idPago}`, JSON.stringify(limpio));

    // Determinar tipo de cirugía “efectivo” desde sessionStorage si ya existe
    const preset = (sessionStorage.getItem("preop_tipoCirugia") || "").trim();
    const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").trim();
    const seleccion = preset && preset.startsWith("Otro") ? (otro || preset) : preset;

    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos },
          comorbilidades: limpio,
          ...(seleccion ? { tipoCirugia: seleccion } : {}),
        }),
      });
    } catch {}

    if (seleccion) {
      setTipoCirugia(seleccion);
      await llamarIAyConstruirPreview(seleccion, limpio);
    } else {
      setPaso("cirugia");
    }
  };

  // ========= Paso 2: Confirmar tipo de cirugía
  const handleConfirmarCirugia = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    let seleccion = tipoCirugia;
    if (!seleccion) return alert("Seleccione el tipo de cirugía.");
    if (seleccion.startsWith("Otro") && !tipoCirugiaLibre.trim())
      return alert("Especifique el tipo de cirugía en 'Otro'.");
    if (seleccion.startsWith("Otro")) seleccion = tipoCirugiaLibre.trim();

    setTipoCirugia(seleccion);
    sessionStorage.setItem(`preop_tipoCirugia_${idPago}`, seleccion);

    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos },
          comorbilidades,
          tipoCirugia: seleccion,
        }),
      });
    } catch {}

    await llamarIAyConstruirPreview(seleccion, comorbilidades);
  };

  // ========= Paso 3: IA → examenes/informe → PREVIEW (sin fallback)
  const llamarIAyConstruirPreview = async (tipoSel, comorb) => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    setPaso("ia_cargando");
    try {
      const payload = {
        idPago,
        paciente: {
          nombre: datos?.nombre || "",
          rut: datos?.rut || "",
          edad: Number(datos?.edad) || null,
          dolor: datos?.dolor || "",
          lado: datos?.lado || "",
        },
        comorbilidades: comorb || comorbilidades || {},
        tipoCirugia: tipoSel || tipoCirugia || "",
        // ❌ sin catálogo fijo: dejamos que el backend IA decida
      };

      const res = await fetch(`${BACKEND_BASE}/ia-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let examenes = [];
      let informe = "";
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.examenes)) examenes = data.examenes;
        informe = (data?.informeIA || "").toString();
      }

      setExamenesIA(examenes);
      setInformeIA(informe);

      sessionStorage.setItem(`preop_examenes_IA_${idPago}`, JSON.stringify(examenes));
      sessionStorage.setItem(`preop_informe_IA_${idPago}`, informe);

      try {
        await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idPago,
            datosPaciente: { ...datos },
            comorbilidades: comorb || comorbilidades || {},
            tipoCirugia: tipoSel || tipoCirugia || "",
            examenesIA: examenes,
            informeIA: informe,
          }),
        });
      } catch {}

      setPaso("preview");
    } catch (e) {
      console.error("Fallo IA-Preop:", e);
      setExamenesIA([]);
      setInformeIA("No fue posible obtener el informe de IA en este momento.");
      setPaso("preview");
    }
  };

  // ========= Paso 4: Pago (solo desde PREVIEW)
  const handlePagarDesdePreview = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos },
          comorbilidades,
          tipoCirugia,
          examenesIA: Array.isArray(examenesIA) ? examenesIA : [],
          informeIA: informeIA || "",
        }),
      });

      await irAPagoKhipu({ ...datos }, { idPago, modulo: "preop" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (preop):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  // ========= Descargar PDF
  const handleDescargarPreop = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, { cache: "no-store" });
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
          if (i === maxIntentos) alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
          continue;
        }

        if (r.status === 404) {
          if (!reinyectado) {
            setMensajeDescarga("Restaurando datos…");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datos;

            await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
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
    } catch (error) {
      console.error(error);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  // ========= Simular Pago (guest)
  const handleSimularPagoGuest = async () => {
    const idPago = "preop_guest_" + Date.now();
    const datosGuest = {
      nombre: "Guest",
      rut: "99999999-9",
      edad: 30,
      dolor: "Rodilla",
      lado: "Izquierda",
    };

    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datosGuest));

    await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, datosPaciente: datosGuest }),
    });

    const url = new URL(window.location.href);
    url.searchParams.set("pago", "ok");
    url.searchParams.set("idPago", idPago);
    window.location.href = url.toString();
  };

  // ================= UI =================
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, color: T.primary }}>Vista previa — Exámenes preoperatorios</h3>

      {/* Datos Paciente */}
      <div style={{ marginBottom: 10, color: T.text }}>
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div>
          <strong>Clínica:</strong>{" "}
          {`Dolor en ${(datos?.dolor || "")}${datos?.lado ? ` ${datos.lado}` : ""}`.trim() || "—"}
        </div>
        {tipoCirugia ? (
          <div><strong>Tipo de cirugía:</strong> {tipoCirugia}</div>
        ) : null}
      </div>

      {/* PREVIEW (solo lo devuelto por IA) */}
      {(paso === "preview" || (Array.isArray(examenesIA) && (examenesIA.length || informeIA))) && (
        <>
          {Array.isArray(examenesIA) && examenesIA.length > 0 ? (
            <div>
              <strong>Exámenes a solicitar (IA):</strong>
              <ul style={{ marginTop: 6 }}>
                {examenesIA.map((e, idx) => (
                  <li key={`${e}-${idx}`}>{typeof e === "string" ? e : e?.nombre || JSON.stringify(e)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={{ marginTop: 6, color: T.textMuted }}>
              (La IA no devolvió una lista de exámenes en esta ocasión.)
            </div>
          )}

          {informeIA ? (
            <div style={{ marginTop: 8 }}>
              <strong>Informe IA (resumen):</strong>
              <div style={styles.informeBox}>{informeIA}</div>
            </div>
          ) : null}
        </>
      )}

      {/* Controles según estado */}
      {pagoRealizado ? (
        <button
          style={{ ...styles.btn, marginTop: 12 }}
          onClick={handleDescargarPreop}
          disabled={descargando}
          title={mensajeDescarga || "Verificar y descargar"}
        >
          {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
        </button>
      ) : (
        <>
          {paso === "idle" && (
            <>
              <button
                style={{ ...styles.btn, backgroundColor: T.primary, marginTop: 12 }}
                onClick={handleContinuarPreop}
                title="Comorbilidades → (Tipo de cirugía si falta) → IA → Preview → Pago"
              >
                Continuar (Pre Op)
              </button>
              <button
                style={{ ...styles.btn, backgroundColor: T.muted, marginTop: 8 }}
                onClick={handleSimularPagoGuest}
                title="Simular retorno pagado (solo pruebas)"
              >
                Simular Pago (Guest)
              </button>
            </>
          )}

          {paso === "comorbilidades" && (
            <div style={styles.modal}>
              <div style={styles.modalCard}>
                <h4 style={{ marginTop: 0, color: T.primary }}>Formulario de Comorbilidades</h4>
                <FormularioComorbilidades
                  initial={comorbilidades || {}}
                  onSave={handleEnviarComorbilidades}
                  onCancel={() => setPaso("idle")}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...styles.btn, background: T.muted }} onClick={() => setPaso("idle")}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {paso === "cirugia" && (
            <div style={styles.modal}>
              <div style={styles.modalCard}>
                <h4 style={{ marginTop: 0, color: T.primary }}>Seleccione tipo de cirugía</h4>
                <div style={{ display: "grid", gap: 8 }}>
                  {TIPOS_CIRUGIA.map((t) => (
                    <label key={t} style={styles.radioRow}>
                      <input
                        type="radio"
                        name="tipoCirugia"
                        value={t}
                        checked={tipoCirugia === t}
                        onChange={(e) => setTipoCirugia(e.target.value)}
                      />
                      <span style={{ marginLeft: 8 }}>{t}</span>
                    </label>
                  ))}
                  {tipoCirugia?.startsWith("Otro") && (
                    <input
                      placeholder="Especifique el tipo de cirugía"
                      value={tipoCirugiaLibre}
                      onChange={(e) => setTipoCirugiaLibre(e.target.value)}
                      style={styles.input}
                    />
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...styles.btn, background: T.muted }} onClick={() => setPaso("comorbilidades")}>
                    Volver
                  </button>
                  <button style={{ ...styles.btn, background: T.primary }} onClick={handleConfirmarCirugia}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {paso === "ia_cargando" && (
            <div style={{ marginTop: 12, fontStyle: "italic", color: T.textMuted }}>
              Generando resumen e indicación de exámenes con IA…
            </div>
          )}

          {paso === "preview" && (
            <button
              style={{ ...styles.btn, backgroundColor: T.primary, marginTop: 12 }}
              onClick={handlePagarDesdePreview}
            >
              Pagar ahora (Pre Op)
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ================= Helpers ================= */

function normalizarComorbilidades(c) {
  if (!c) return {};
  // Mapeo compatible con tu backend preopIA.js (booleans + textos)
  return {
    hta: !!c.hta,
    dm2: !!c.dm2,
    dislipidemia: !!c.dislipidemia,
    obesidad: !!c.obesidad,
    tabaquismo: !!c.tabaquismo,
    epoc_asma: !!c.epoc_asma,
    cardiopatia: !!c.cardiopatia,
    erc: !!c.erc,
    hipotiroidismo: !!c.hipotiroidismo,
    artritis_reumatoide: !!c.artritis_reumatoide,

    alergias: (c.alergias || "").toString(),
    medicamentos: (c.medicamentos || "").toString(),
    cirugiasPrevias: (c.cirugiasPrevias || "").toString(),
    anticoagulantes: !!c.anticoagulantes,
    anticoagulantes_detalle: (c.anticoagulantes_detalle || "").toString(),
    tabaco: (c.tabaco || "").toString(),
    alcohol: (c.alcohol || "").toString(),
    otras: (c.otras || "").toString(),
    observaciones: (c.observaciones || "").toString(),
  };
}

/* ================= Estilos (theme.json) ================= */
const styles = {
  card: {
    background: T.surface,
    borderRadius: 8,
    padding: 16,
    boxShadow: T.shadowSm,
    border: `1px solid ${T.border}`,
    color: T.text,
  },
  btn: {
    backgroundColor: T.primary,
    color: T.onPrimary || "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
    boxShadow: T.shadowSm,
  },
  informeBox: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    whiteSpace: "pre-wrap",
    color: T.text,
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: T.overlay || "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 12,
  },
  modalCard: {
    background: T.surface,
    borderRadius: 10,
    padding: 16,
    width: "min(720px, 92vw)",
    boxShadow: T.shadowMd,
    border: `1px solid ${T.border}`,
    color: T.text,
  },
  input: {
    width: "100%",
    padding: "10px",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    fontSize: 14,
    background: T.surface,
    color: T.text,
  },
  radioRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 8px",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    background: T.surface,
    color: T.text,
  },
};
