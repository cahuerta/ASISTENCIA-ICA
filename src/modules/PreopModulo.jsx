"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

// Catálogo base (nombres EXACTOS)
const EXAMENES_FIJOS = [
  "HEMOGRAMA MAS VHS",
  "PCR",
  "ELECTROLITOS PLASMATICOS",
  "PERFIL BIOQUIMICO",
  "PERFIL LIPIDICO",
  "PERFIL HEPATICO",
  "CREATININA",
  "TTPK",
  "HEMOGLOBINA GLICOSILADA",
  "VITAMINA D",
  "GRUPO Y RH",
  "VIH",
  "ORINA",
  "UROCULTIVO",
  "ECG DE REPOSO",
];

// Opciones de cirugía
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

  // ===== Estados nuevos del flujo
  // pasos: 'idle' | 'comorbilidades' | 'cirugia' | 'ia_cargando' | 'preview'
  const [paso, setPaso] = useState("idle");

  const [comorbilidades, setComorbilidades] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      const raw = idPago ? sessionStorage.getItem(`preop_comorbilidades_${idPago}`) : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [tipoCirugia, setTipoCirugia] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      return idPago ? sessionStorage.getItem(`preop_tipoCirugia_${idPago}`) || "" : "";
    } catch {
      return "";
    }
  });
  const [tipoCirugiaLibre, setTipoCirugiaLibre] = useState("");

  const [examenesIA, setExamenesIA] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      const raw = idPago ? sessionStorage.getItem(`preop_examenes_IA_${idPago}`) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [informeIA, setInformeIA] = useState(() => {
    try {
      const idPago = sessionStorage.getItem("idPago") || "";
      return idPago ? sessionStorage.getItem(`preop_informe_IA_${idPago}`) || "" : "";
    } catch {
      return "";
    }
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
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`);
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

  // ========= Paso 0: Continuar (abre Comorbilidades)
  const handleContinuarPreop = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datos.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de continuar.");
      return;
    }

    const idPago =
      sessionStorage.getItem("idPago") ||
      "preop_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

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

  // ========= Paso 1: Recibir Comorbilidades
  const handleEnviarComorbilidades = async (formData) => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const limpio = normalizarComorbilidades(formData); // ← alineado a preopIA.js
    setComorbilidades(limpio);
    sessionStorage.setItem(`preop_comorbilidades_${idPago}`, JSON.stringify(limpio));

    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, datosPaciente: { ...datos }, comorbilidades: limpio }),
      });
    } catch {}

    setPaso("cirugia");
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

    await llamarIAyConstruirPreview();
  };

  // ========= Paso 3: IA → examenes/informe → PREVIEW
  const llamarIAyConstruirPreview = async () => {
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
        comorbilidades,
        tipoCirugia,
        catalogoExamenes: EXAMENES_FIJOS, // mantén nombres exactos
      };

      const res = await fetch(`${BACKEND_BASE}/ia-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let examenes = null;
      let informe = "";
      if (res.ok) {
        const data = await res.json();
        examenes = limpiarListaExamenesContraCatalogo(data?.examenes, EXAMENES_FIJOS);
        informe = (data?.informeIA || "").toString();
      }

      const finalExamenes = examenes && examenes.length ? examenes : EXAMENES_FIJOS;
      const finalInforme = informe || "Informe IA no disponible por el momento.";

      setExamenesIA(finalExamenes);
      setInformeIA(finalInforme);

      sessionStorage.setItem(`preop_examenes_IA_${idPago}`, JSON.stringify(finalExamenes));
      sessionStorage.setItem(`preop_informe_IA_${idPago}`, finalInforme);

      try {
        await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idPago,
            datosPaciente: { ...datos },
            comorbilidades,
            tipoCirugia,
            examenesIA: finalExamenes,
            informeIA: finalInforme,
          }),
        });
      } catch {}

      setPaso("preview");
    } catch (e) {
      console.error("Fallo IA-Preop:", e);
      setExamenesIA(EXAMENES_FIJOS);
      setInformeIA("Informe IA no disponible por el momento.");
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
          examenesIA: examenesIA || EXAMENES_FIJOS,
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
                examenesIA: examenesIA || EXAMENES_FIJOS,
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
      <h3 style={{ marginTop: 0 }}>Vista previa — Exámenes preoperatorios</h3>

      {/* Datos Paciente */}
      <div style={{ marginBottom: 10 }}>
        <div>
          <strong>Paciente:</strong> {datos?.nombre || "—"}
        </div>
        <div>
          <strong>RUT:</strong> {datos?.rut || "—"}
        </div>
        <div>
          <strong>Edad:</strong> {datos?.edad || "—"}
        </div>
        <div>
          <strong>Clínica:</strong>{" "}
          {`Dolor en ${(datos?.dolor || "")}${datos?.lado ? ` ${datos.lado}` : ""}`.trim() || "—"}
        </div>
      </div>

      {/* PREVIEW */}
      {(paso === "preview" || examenesIA) && (
        <>
          <div>
            <strong>Exámenes a solicitar:</strong>
            <ul style={{ marginTop: 6 }}>
              {(examenesIA || EXAMENES_FIJOS).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>

          {!!informeIA && (
            <div style={{ marginTop: 8 }}>
              <strong>Informe IA (resumen):</strong>
              <div style={styles.informeBox}>{informeIA}</div>
            </div>
          )}
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
          {descargando ? mensajeDescarga || "Verificando…" : "Descargar Documento"}
        </button>
      ) : (
        <>
          {paso === "idle" && (
            <>
              <button
                style={{ ...styles.btn, backgroundColor: "#004B94", marginTop: 12 }}
                onClick={handleContinuarPreop}
                title="Comorbilidades → Tipo de cirugía → IA → Preview → Pago"
              >
                Continuar (Pre Op)
              </button>
              <button
                style={{ ...styles.btn, backgroundColor: "#777", marginTop: 8 }}
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
                <h4 style={{ marginTop: 0 }}>Formulario de Comorbilidades</h4>

                <FormularioComorbilidades
                  initial={comorbilidades || {}}
                  onSave={handleEnviarComorbilidades}
                  onCancel={() => setPaso("idle")}
                />

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...styles.btn, background: "#777" }} onClick={() => setPaso("idle")}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {paso === "cirugia" && (
            <div style={styles.modal}>
              <div style={styles.modalCard}>
                <h4 style={{ marginTop: 0 }}>Seleccione tipo de cirugía</h4>
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
                  <button style={{ ...styles.btn, background: "#777" }} onClick={() => setPaso("comorbilidades")}>
                    Volver
                  </button>
                  <button style={{ ...styles.btn, background: "#004B94" }} onClick={handleConfirmarCirugia}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {paso === "ia_cargando" && (
            <div style={{ marginTop: 12, fontStyle: "italic" }}>
              Generando resumen e indicación de exámenes con IA…
            </div>
          )}

          {paso === "preview" && (
            <button
              style={{ ...styles.btn, backgroundColor: "#004B94", marginTop: 12 }}
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

/**
 * Normaliza el payload del formulario para que coincida con lo que espera el backend (preopIA.js):
 * - Booleans planos para comorbilidades (hta, dm2, …, anticoagulantes, artritis_reumatoide)
 * - Strings para: alergias, medicamentos, cirugiasPrevias, tabaco, alcohol, observaciones, otras
 * - Campo adicional 'anticoagulantes_detalle' (string)
 */
function normalizarComorbilidades(c = {}) {
  // permitir tanto objetos {alergias:{tiene,detalle}} como strings
  const alergiaStr =
    typeof c.alergias === "string"
      ? c.alergias
      : c.alergias_flag
      ? String(c.alergias_detalle || "").trim()
      : "";

  const anticoagulantesBool =
    typeof c.anticoagulantes === "boolean"
      ? c.anticoagulantes
      : !!c?.anticoagulantes?.usa;

  const anticoagulantesDetalle =
    typeof c.anticoagulantes_detalle === "string"
      ? c.anticoagulantes_detalle
      : (c?.anticoagulantes?.detalle || "").toString();

  return {
    // booleans principales
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

    // anticoagulantes como espera el backend
    anticoagulantes: anticoagulantesBool,
    anticoagulantes_detalle: anticoagulantesDetalle,

    // textos libres esperados por el backend
    alergias: alergiaStr,
    medicamentos: (c.medicamentos || c.meds || "").toString(),
    cirugiasPrevias: (c.cirugiasPrevias || c.cirugias_previas || c.cirugias || "").toString(),
    tabaco: (c.tabaco || (c.tabaquismo ? "Sí" : "")).toString(),
    alcohol: (c.alcohol || "").toString(),
    observaciones: (c.observaciones || "").toString(),
    otras: (c.otras || "").toString(),
  };
}

function limpiarListaExamenesContraCatalogo(lista, catalogo) {
  if (!Array.isArray(lista)) return null;
  const setCat = new Set(catalogo.map((s) => s.trim().toUpperCase()));
  const clean = [];
  for (const item of lista) {
    const nombre = (typeof item === "string" ? item : item?.nombre || "")
      .toString()
      .trim()
      .toUpperCase();
    if (setCat.has(nombre)) {
      const original = catalogo.find((c) => c.toUpperCase() === nombre);
      clean.push(original);
    }
  }
  return clean.length ? clean : null;
}

/* ================= Estilos ================= */
const styles = {
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  btn: {
    backgroundColor: "#0072CE",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
  },
  informeBox: {
    background: "#F7F9FC",
    border: "1px solid #E3E9F2",
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    whiteSpace: "pre-wrap",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalCard: {
    background: "#fff",
    borderRadius: 10,
    padding: 16,
    width: "min(720px, 92vw)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #D8DFEA",
    borderRadius: 8,
    fontSize: 14,
  },
  radioRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 8px",
    border: "1px solid #E3E9F2",
    borderRadius: 8,
  },
};
