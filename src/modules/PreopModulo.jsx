// ==============================
// src/modules/PreopModulo.jsx
// MÓDULO PREOP — VERSIÓN COMPLETA
// Con flujo de idPago idéntico a Trauma pero con prefijo preop_
// ==============================
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";

/* Aviso legal */
import AvisoLegal from "../components/AvisoLegal.jsx";

/* Paso “esquema” */
import EsquemaAnterior from "../EsquemaAnterior.jsx";
import EsquemaPosterior from "../EsquemaPosterior.jsx";
import EsquemaToggleTabs from "../EsquemaToggleTabs.jsx";

/* Formularios */
import FormularioTipoCirugia from "../FormularioTipoCirugia.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";

/* Layout */
import ModuloLayout from "../components/ModuloLayout.jsx";
import logoPreop from "../assets/logo_examenes_pre.png";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";
const T = getTheme();

/* ============================================================
   ID PAGO — MISMA LÓGICA QUE TRAUMA, SOLO CAMBIA EL PREFIJO
   ============================================================ */
function ensurePreopIdPago() {
  try {
    let id = sessionStorage.getItem("idPago");

    // Si ya existe un idPago válido del módulo → NO LO TOCAMOS
    if (id && (/^preop_/.test(id) || /^pago_/.test(id))) return id;

    // si no existe o es de otro módulo → crear uno propio
    id = `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", id);
    return id;
  } catch {
    return `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

/* Etiquetas */
const LABELS_COMORB = {
  hta: "Hipertensión arterial",
  dm2: "Diabetes mellitus tipo 2",
  dislipidemia: "Dislipidemia",
  obesidad: "Obesidad",
  tabaquismo: "Tabaquismo",
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

function prettyComorb(obj = {}) {
  try {
    const out = [];
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const label = LABELS_COMORB[k] || k.replace(/_/g, " ");

      if (typeof v === "boolean" && v) out.push(label);
      else if (typeof v === "string" && v.trim()) out.push(`${label}: ${v}`);
      else if (typeof v === "object" && v?.detalle)
        out.push(`${label}: ${v.detalle}`);
    }
    return out;
  } catch {
    return [];
  }
}

function generoPalabra(s) {
  const g = String(s || "").toLowerCase();
  if (g.includes("fem")) return "Mujer";
  if (g.includes("mas")) return "Hombre";
  return "Paciente";
}

function resumenInicial({ datos, comorb, tipoCirugia }) {
  const sujeto = generoPalabra(datos?.genero);
  const edad = datos?.edad ? `${datos.edad} años` : "";
  const antecedentes =
    prettyComorb(comorb).length > 0
      ? `con antecedentes de: ${prettyComorb(comorb).join(", ")}`
      : "sin comorbilidades relevantes";
  const cir = tipoCirugia || "la cirugía indicada";

  return `${sujeto} ${edad}, ${antecedentes}. Solicita exámenes prequirúrgicos para operarse de ${cir}.`;
}

/* ===================================================================
   COMPONENTE PRINCIPAL
   =================================================================== */
export default function PreopModulo({ initialDatos, onIrPantallaTres }) {
  const [fase, setFase] = useState("esquema");
  const [vista, setVista] = useState("anterior");

  const [datos, setDatos] = useState(initialDatos || {});
  const [comorbilidades, setComorbilidades] = useState({});
  const [tipoCirugia, setTipoCirugia] = useState("");

  const [examenesIA, setExamenesIA] = useState([]);
  const [informeIA, setInformeIA] = useState("");
  const [stepStarted, setStepStarted] = useState(false);

  const [pagoRealizado, setPagoRealizado] = useState(false);

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const pollerRef = useRef(null);

  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");

  /* ============================================================
     INIT — RECUPERA DATOS + RESPETA idPago EXACTO COMO TRAUMA
     ============================================================ */
  useEffect(() => {
    // Aviso legal
    const ok =
      sessionStorage.getItem("preop_aviso_ok") &&
      sessionStorage.getItem("preop_aviso_ok") === "1";
    if (!ok) setMostrarAviso(true);

    // Datos básicos
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      if (raw) setDatos((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {}

    // Tipo cirugía
    try {
      const fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").trim();
      const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").trim();
      const final =
        fijo.toUpperCase().startsWith("OTRO") && otro ? otro : fijo;
      setTipoCirugia(final);
    } catch {}

    // Comorbilidades
    try {
      const raw = sessionStorage.getItem("preop_comorbilidades_data");
      if (raw) setComorbilidades(JSON.parse(raw));
    } catch {}

    // IA previa
    try {
      const ex = JSON.parse(sessionStorage.getItem("preop_ia_examenes") || "[]");
      const inf = sessionStorage.getItem("preop_ia_resumen") || "";
      if (ex.length || inf) {
        setExamenesIA(ex);
        setInformeIA(inf);
        setStepStarted(true);
        setFase("preview");
      }
    } catch {}

    // Retorno de pago — NO toques idPago → exacto como Trauma
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");

    const idPago = sessionStorage.getItem("idPago") || "";

    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      setStepStarted(true);
      setFase("preview");

      if (pollerRef.current) clearInterval(pollerRef.current);
      let i = 0;

      pollerRef.current = setInterval(async () => {
        i++;
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`);
        } catch {}
        if (i >= 30) {
          clearInterval(pollerRef.current);
        }
      }, 2000);
    }

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, []);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ============================================================
     ESQUEMA
     ============================================================ */
  const onSeleccionZona = (zona) => {
    let dolor = "",
      lado = "";
    const z = (zona || "").toLowerCase();

    if (z.includes("cadera")) {
      dolor = "Cadera";
      lado = z.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (z.includes("rodilla")) {
      dolor = "Rodilla";
      lado = z.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (z.includes("hombro")) {
      dolor = "Hombro";
      lado = z.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (z.includes("codo")) {
      dolor = "Codo";
      lado = z.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (z.includes("mano")) {
      dolor = "Mano";
      lado = z.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (z.includes("tobillo")) {
      dolor = "Tobillo";
      lado = z.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (z.includes("columna cervical")) dolor = "Columna cervical";
    else if (z.includes("columna dorsal")) dolor = "Columna dorsal";
    else if (z.includes("columna lumbar")) dolor = "Columna lumbar";

    const next = { ...datos, dolor, lado };

    setDatos(next);
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
  };

  /* ============================================================
     IA PREOP
     ============================================================ */
  const handleGenerarIA = async () => {
    try {
      const idPago = ensurePreopIdPago();
      sessionStorage.setItem("modulo", "preop");

      const payload = {
        idPago,
        paciente: datos,
        comorbilidades,
        tipoCirugia,
      };

      const r = await fetch(`${BACKEND_BASE}/preop-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error("Error IA Preop");

      const j = await r.json();

      const ex = Array.isArray(j?.examenes) ? j.examenes : [];
      const inf = j?.informeIA || "";

      sessionStorage.setItem("preop_ia_examenes", JSON.stringify(ex));
      sessionStorage.setItem("preop_ia_resumen", inf);

      setExamenesIA(ex);
      setInformeIA(inf);
      setStepStarted(true);
      setFase("preview");
    } catch (err) {
      console.error(err);
      alert("Error al generar IA.");
    }
  };

  /* ============================================================
     PAGO — IDÉNTICO A TRAUMA
     ============================================================ */
  const handlePagar = async () => {
    const idPago = ensurePreopIdPago();

    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");
    sessionStorage.setItem("pantalla", "tres");
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));

    const payload = {
      idPago,
      paciente: datos,
      comorbilidades,
      tipoCirugia,
      examenesIA,
      informeIA,
    };

    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (typeof onIrPantallaTres === "function") {
        onIrPantallaTres({ ...datos, idPago });
      } else {
        await irAPagoKhipu(datos, { idPago, modulo: "preop" });
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo iniciar el pago.");
    }
  };

  /* ============================================================
     DESCARGAR — igual que Trauma
     ============================================================ */
  const handleDescargar = async () => {
    const idPago = sessionStorage.getItem("idPago") || "";

    if (!idPago) return alert("ID de pago no encontrado");

    const intenta = async () => {
      let r = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, {
        cache: "no-store",
      });
      if (!r.ok)
        r = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });

      if (r.status === 404) return { ok: false, status: 404 };
      if (r.status === 402) return { ok: false, status: 402 };
      if (!r.ok) throw new Error("Fallo descarga");

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `preop_${(datos?.nombre || "paciente").replace(/ /g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return { ok: true };
    };

    setDescargando(true);
    setMensajeDescarga("Verificando…");

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
          await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idPago,
              paciente: datos,
              comorbilidades,
              tipoCirugia,
              examenesIA,
              informeIA,
            }),
          }).catch(() => {});
          reinyectado = true;
          await sleep(500);
          continue;
        }
        break;
      }
    }

    setDescargando(false);
    setMensajeDescarga("");
  };

  /* ============================================================
     UI
     ============================================================ */
  const chipsComorb = prettyComorb(comorbilidades);

  const tituloFase = {
    esquema: "Seleccione la zona de la cirugía",
    tipo: "Tipo de cirugía",
    comorb: "Comorbilidades",
    preview: stepStarted
      ? "Exámenes sugeridos por IA"
      : "Resumen preoperatorio",
  }[fase];

  const subtitle = {
    esquema: "Seleccione la zona en el esquema corporal",
    tipo: "Determine el tipo de cirugía planificada",
    comorb: "Registre condiciones médicas relevantes",
    preview: stepStarted
      ? "Revise y continúe al pago"
      : "Genere la propuesta de exámenes",
  }[fase];

  return (
    <ModuloLayout
      title="Asistente Preoperatorio"
      subtitle={subtitle}
      logo={logoPreop}
      variant="preop"
    >
      <div className="card">

        <AvisoLegal
          visible={mostrarAviso}
          onAccept={() => {
            sessionStorage.setItem("preop_aviso_ok", "1");
            setMostrarAviso(false);
          }}
        />

        <h3 style={{ color: T.primary }}>{tituloFase}</h3>

        {/* === ESQUEMA === */}
        {fase === "esquema" && (
          <div className="card">
            <EsquemaToggleTabs vista={vista} onChange={setVista} />

            {vista === "anterior" ? (
              <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
            ) : (
              <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />
            )}

            <div className="mt-8 muted">
              {datos?.dolor ? (
                <>
                  Zona: <strong>{datos.dolor}{datos?.lado ? ` — ${datos.lado}` : ""}</strong>
                </>
              ) : (
                "Seleccione una zona"
              )}
            </div>

            <button
              className="btn mt-12"
              disabled={!datos?.dolor}
              onClick={() => setFase("tipo")}
            >
              Continuar → Tipo de cirugía
            </button>
          </div>
        )}

        {/* === TIPO CIRUGÍA === */}
        {fase === "tipo" && (
          <div className="card">
            <FormularioTipoCirugia
              datos={datos}
              onTipoCirugiaChange={() => {
                try {
                  const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
                  const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
                  const final =
                    fijo.toUpperCase().startsWith("OTRO") && otro
                      ? otro
                      : fijo.trim();
                  setTipoCirugia(final);
                } catch {}
              }}
            />

            <button
              className="btn mt-16"
              onClick={() => {
                const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
                const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
                const isOtro = fijo.toUpperCase().startsWith("OTRO");
                const ok =
                  (fijo && !isOtro) ||
                  (isOtro && otro.trim());

                if (!ok) {
                  alert("Seleccione un tipo de cirugía válido.");
                  return;
                }

                setFase("comorb");
              }}
            >
              Continuar → Comorbilidades
            </button>
          </div>
        )}

        {/* === COMORBILIDADES === */}
        {fase === "comorb" && (
          <div className="card">
            <FormularioComorbilidades
              initial={comorbilidades}
              onSave={(c) => {
                sessionStorage.setItem(
                  "preop_comorbilidades_data",
                  JSON.stringify(c)
                );
                sessionStorage.removeItem("preop_ia_examenes");
                sessionStorage.removeItem("preop_ia_resumen");
                setComorbilidades(c);
                setFase("preview");
              }}
            />
          </div>
        )}

        {/* === PREVIEW === */}
        {fase === "preview" && (
          <>
            {/* Datos básicos */}
            <section style={{ marginBottom: 10 }}>
              <div><strong>Paciente:</strong> {datos?.nombre}</div>
              <div><strong>RUT:</strong> {datos?.rut}</div>
              <div><strong>Edad:</strong> {datos?.edad}</div>
              <div><strong>Sexo:</strong> {datos?.genero}</div>
              <div>
                <strong>Área:</strong>{" "}
                {`${datos?.dolor || ""} ${datos?.lado || ""}`.trim()}
              </div>
              {tipoCirugia && (
                <div><strong>Cirugía:</strong> {tipoCirugia}</div>
              )}
            </section>

            {/* Resumen sin IA */}
            {!stepStarted && (
              <>
                <div className="mono">
                  {resumenInicial({ datos, comorb: comorbilidades, tipoCirugia })}
                </div>

                <button
                  className="btn fullw mt-12"
                  onClick={handleGenerarIA}
                >
                  Aceptar y continuar
                </button>
              </>
            )}

            {/* Con IA */}
            {stepStarted && (
              <>
                {chipsComorb.length > 0 && (
                  <section className="mt-8">
                    <strong>Comorbilidades:</strong>
                    <div className="chips mt-6">
                      {chipsComorb.map((t, i) => (
                        <span key={i} className="chip">{t}</span>
                      ))}
                    </div>
                  </section>
                )}

                {examenesIA.length > 0 && (
                  <section className="mt-12">
                    <strong>Exámenes sugeridos (IA):</strong>
                    <ul className="mt-6">
                      {examenesIA.map((e, i) => (
                        <li key={i}>{typeof e === "string" ? e : e?.nombre}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {informeIA && (
                  <section className="mt-12">
                    <strong>Informe IA:</strong>
                    <div className="mono mt-6">{informeIA}</div>
                  </section>
                )}

                {pagoRealizado ? (
                  <button
                    className="btn fullw mt-16"
                    onClick={handleDescargar}
                    disabled={descargando}
                  >
                    {descargando
                      ? mensajeDescarga || "Descargando…"
                      : "Descargar Documento"}
                  </button>
                ) : (
                  <button
                    className="btn fullw mt-16"
                    onClick={handlePagar}
                  >
                    Pagar ahora (Preop)
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ModuloLayout>
  );
}
