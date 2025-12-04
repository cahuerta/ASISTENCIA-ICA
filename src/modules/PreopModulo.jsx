// src/modules/PreopModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import { getTheme } from "../theme.js";

/* Aviso legal (gating) */
import AvisoLegal from "../components/AvisoLegal.jsx";

/* Paso “esquema” (SIN mapper) */
import EsquemaAnterior from "../EsquemaAnterior.jsx";
import EsquemaPosterior from "../EsquemaPosterior.jsx";
import EsquemaToggleTabs from "../EsquemaToggleTabs.jsx";

/* Formularios PREOP */
import FormularioTipoCirugia from "../FormularioTipoCirugia.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";

/* NUEVO: Layout común de módulos + logo PREOP */
import ModuloLayout from "../components/ModuloLayout.jsx";
import logoPreop from "../assets/logo_examenes_pre.png";

const T = getTheme();
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ===========================================================
   ==  ID PAGO — MISMO FLUJO QUE TRAUMA, PREFIJO "preop_"   ==
   =========================================================== */
function ensurePreopIdPago() {
  try {
    let id = sessionStorage.getItem("idPago");

    // Si ya existe y viene de este módulo o de pago genérico, se respeta
    if (id && (/^preop_/.test(id) || /^pago_/.test(id))) {
      return id;
    }

    // Si no hay idPago, se crea uno nuevo SOLO UNA VEZ
    id = `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", id);
    return id;

  } catch {
    return `preop_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

/* Etiquetas amigables */
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
      if (typeof v === "string" && v.trim()) out.push(`${label}: ${v.trim()}`);
    }
    return out;
  } catch {
    return [];
  }
}

function generoPalabra(g) {
  const s = String(g).toUpperCase();
  if (s === "MASCULINO") return "Hombre";
  if (s === "FEMENINO") return "Mujer";
  return "Paciente";
}

function resumenInicialPreop({ datos, comorb, tipoCirugia }) {
  const sujeto = generoPalabra(datos?.genero);
  const edad = datos?.edad ? `${datos.edad} años` : "";
  const lista = prettyComorb(comorb);
  const antecedentes = lista.length
    ? `con antecedentes de: ${lista.join(", ")}`
    : "sin comorbilidades relevantes registradas";
  const cir = (tipoCirugia || "").trim() || "la cirugía indicada";
  return `${sujeto} ${edad}, ${antecedentes}. Solicita exámenes prequirúrgicos para operarse de ${cir}.`;
}

export default function PreopModulo({ initialDatos, onIrPantallaTres }) {
  const [fase, setFase] = useState("esquema");
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);

  const [loadingIA, setLoadingIA] = useState(false);
  const [examenesIA, setExamenesIA] = useState([]);
  const [informeIA, setInformeIA] = useState("");

  const [comorbilidades, setComorbilidades] = useState({});
  const [tipoCirugia, setTipoCirugia] = useState("");

  const [stepStarted, setStepStarted] = useState(false);
  const [vista, setVista] = useState("anterior");

  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    try {
      sessionStorage.setItem("preop_aviso_ok", "1");
    } catch {}
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    alert("Debes aceptar el aviso legal para continuar.");
  };

  useEffect(() => {
    /* Aviso legal */
    const avisoOk = (() => {
      try {
        return sessionStorage.getItem("preop_aviso_ok") === "1";
      } catch {
        return false;
      }
    })();
    if (!avisoOk) setMostrarAviso(true);

    /* Datos básicos */
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((p) => ({ ...p, ...JSON.parse(saved) }));
    } catch {}

    /* Tipo cirugía */
    try {
      const fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
      const otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
      const final = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
      setTipoCirugia(final || "");
    } catch {}

    /* Comorbilidades */
    try {
      const raw = sessionStorage.getItem("preop_comorbilidades_data");
      if (raw) setComorbilidades(JSON.parse(raw));
    } catch {}

    /* IA previa */
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

    /* ===== Retorno de pago ===== */
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");

    const idPago = (() => {
      try {
        return sessionStorage.getItem("idPago") || "";
      } catch {
        return "";
      }
    })();

    if (pago === "ok" && idPago) {
      setPagoRealizado(true);
      setStepStarted(true);
      setFase("preview");

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
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, []);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ==================================================
     ========== Selección zona =========================
     ================================================== */
  const onSeleccionZona = (zona) => {
    let dolor = "",
      lado = "";
    const zl = String(zona || "").toLowerCase();

    if (zl.includes("columna cervical")) dolor = "Columna cervical";
    else if (zl.includes("columna dorsal")) dolor = "Columna dorsal";
    else if (zl.includes("columna lumbar")) dolor = "Columna lumbar";
    else if (zl.includes("cadera")) {
      dolor = "Cadera";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("rodilla")) {
      dolor = "Rodilla";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("hombro")) {
      dolor = "Hombro";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("codo")) {
      dolor = "Codo";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("mano")) {
      dolor = "Mano";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zl.includes("tobillo")) {
      dolor = "Tobillo";
      lado = zl.includes("izquierda") ? "Izquierda" : "Derecha";
    }

    const next = { ...datos, dolor, lado };
    setDatos(next);
    try {
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
    } catch {}
  };

  /* ==================================================
     ==================== IA ===========================
     ================================================== */
  const handleGenerarIA = async () => {
    try {
      setLoadingIA(true);

      try {
        const saved = sessionStorage.getItem("datosPacienteJSON");
        if (saved) setDatos((p) => ({ ...p, ...JSON.parse(saved) }));
      } catch {}

      let rawComorb = {};
      try {
        rawComorb = JSON.parse(
          sessionStorage.getItem("preop_comorbilidades_data") || "{}"
        );
      } catch {}
      setComorbilidades(rawComorb || {});

      let fijo = (sessionStorage.getItem("preop_tipoCirugia") || "").toUpperCase();
      let otro = (sessionStorage.getItem("preop_tipoCirugia_otro") || "").toUpperCase();
      const cir = fijo.startsWith("OTRO") ? (otro || "").trim() : fijo.trim();
      setTipoCirugia(cir || "");

      const idPago = ensurePreopIdPago();
      try {
        sessionStorage.setItem("modulo", "preop");
      } catch {}

      const payload = {
        idPago,
        paciente: { ...datos },
        comorbilidades: rawComorb || {},
        tipoCirugia: cir || "",
      };

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

      try {
        sessionStorage.setItem("preop_ia_examenes", JSON.stringify(ex));
        sessionStorage.setItem("preop_ia_resumen", inf || "");
      } catch {}

      setExamenesIA(ex);
      setInformeIA(inf);
      setStepStarted(true);
      setFase("preview");
    } catch (e) {
      console.error(e);
      alert("Error al generar IA.");
    } finally {
      setLoadingIA(false);
    }
  };

  /* ==================================================
     ==================== Pago =========================
     ================================================== */
  const handlePagarDesdePreview = async () => {
    const idPago = ensurePreopIdPago();

    try {
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "preop");
      sessionStorage.setItem("pantalla", "tres");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
    } catch {}

    const payload = {
      idPago,
      paciente: datos,
      comorbilidades,
      tipoCirugia,
      examenesIA,
      informeIA,
    };

    try {
      let r = await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        await fetch(`${BACKEND_BASE}/guardar-datos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idPago, datosPaciente: datos }),
        });
      }

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

  /* ==================================================
     =================== Descargar =====================
     ================================================== */
  const handleDescargarPreop = async () => {
    const idPago = ensurePreopIdPago();
    if (!idPago) return alert("ID de pago no encontrado");

    const intentaDescarga = async () => {
      let res = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, {
          cache: "no-store",
        });
      }

      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preop_${(datos?.nombre || "paciente").replace(/ /g, "_")}.pdf`;
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
          alert("No se pudo descargar el PDF.");
          break;
        }

        alert("No se pudo descargar el PDF.");
        break;
      }
    } catch {
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  const comorbChips = prettyComorb(comorbilidades);

  const tituloFase = {
    esquema: "Seleccione la zona relacionada con su cirugía.",
    tipo: "Indique el tipo de cirugía propuesta.",
    comorb: "Consigne enfermedades previas, tratamientos y alergias relevantes.",
    preview:
      "Revise y confirme la orden; exámenes preoperatorios sugeridos por IA.",
  }[fase];

  const subtitleLayout = {
    esquema:
      "Revise el esquema corporal y marque la zona donde se realizará la cirugía.",
    tipo:
      "Confirme el tipo de cirugía para ajustar la indicación de exámenes preoperatorios.",
    comorb:
      "Registre comorbilidades, tratamientos y alergias antes de generar la orden preoperatoria.",
    preview: stepStarted
      ? "Revise los exámenes sugeridos por IA y continúe al pago o descarga del documento."
      : "Revise el resumen preoperatorio y genere la propuesta de exámenes con IA.",
  }[fase];

  return (
    <ModuloLayout
      logo={logoPreop}
      title="Asistente Preoperatorio"
      subtitle={subtitleLayout}
      variant="preop"
    >
      <div className="card" aria-live="polite">
        <AvisoLegal
          visible={mostrarAviso}
          persist={false}
          onAccept={continuarTrasAviso}
          onReject={rechazarAviso}
        />

        <h3 className="h1" style={{ color: T.primary }}>
          {tituloFase}
        </h3>

        {/* ESQUEMA */}
        {fase === "esquema" && (
          <div className="card" style={{ marginTop: 8 }}>
            <EsquemaToggleTabs vista={vista} onChange={setVista} />
            {vista === "anterior" ? (
              <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
            ) : (
              <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />
            )}
            <div className="mt-8 muted">
              {datos?.dolor ? (
                <>
                  Zona:{" "}
                  <strong>
                    {datos.dolor}
                    {datos.lado ? ` — ${datos.lado}` : ""}
                  </strong>
                </>
              ) : (
                "Seleccione una zona del esquema para continuar"
              )}
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

        {/* TIPO CIRUGÍA */}
        {fase === "tipo" && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="section">
              <h2 className="h1" style={{ margin: 0 }}>
                Tipo de cirugía
              </h2>
              <div className="muted">
                {datos?.dolor ? (
                  <>
                    Zona:{" "}
                    <strong>
                      {datos.dolor}
                      {datos.lado ? ` — ${datos.lado}` : ""}
                    </strong>
                  </>
                ) : (
                  "Seleccione una zona en el paso anterior"
                )}
              </div>
            </div>
            <div className="divider" />
            <FormularioTipoCirugia
              datos={datos}
              onTipoCirugiaChange={() => {
                try {
                  const fijo = (
                    sessionStorage.getItem("preop_tipoCirugia") || ""
                  ).toUpperCase();
                  const otro = (
                    sessionStorage.getItem("preop_tipoCirugia_otro") || ""
                  ).toUpperCase();
                  const final = fijo.startsWith("OTRO")
                    ? (otro || "").trim()
                    : fijo.trim();
                  setTipoCirugia(final || "");
                } catch {}
              }}
            />
            <div className="toolbar right mt-16">
              <button
                className="btn"
                onClick={() => {
                  const fijo =
                    sessionStorage.getItem("preop_tipoCirugia") || "";
                  const otro =
                    sessionStorage.getItem("preop_tipoCirugia_otro") || "";
                  const isOtro = fijo.trim().toUpperCase().startsWith("OTRO");
                  const ok =
                    (fijo && !isOtro) || (isOtro && (otro || "").trim());
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

        {/* COMORBILIDADES */}
        {fase === "comorb" && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="section">
              <h2 className="h1" style={{ margin: 0 }}>
                Comorbilidades
              </h2>
            </div>
            <div className="divider" />
            <FormularioComorbilidades
              initial={comorbilidades || {}}
              onSave={(payload) => {
                try {
                  sessionStorage.setItem(
                    "preop_comorbilidades_data",
                    JSON.stringify(payload || {})
                  );
                  sessionStorage.setItem("preop_comorbilidades_ok", "1");
                  sessionStorage.removeItem("preop_ia_examenes");
                  sessionStorage.removeItem("preop_ia_resumen");
                } catch {}
                setComorbilidades(payload || {});
                setStepStarted(false);
                setFase("preview");
              }}
            />
          </div>
        )}

        {/* PREVIEW */}
        {fase === "preview" && (
          <>
            <section style={{ marginBottom: 10 }}>
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
                <strong>Sexo:</strong> {datos?.genero || "—"}
              </div>
              <div>
                <strong>Motivo/Área:</strong>{" "}
                {`Dolor en ${(datos?.dolor || "")}${
                  datos?.lado ? ` ${datos.lado}` : ""
                }`.trim()}
              </div>
              {tipoCirugia && (
                <div>
                  <strong>Tipo de cirugía:</strong> {tipoCirugia}
                </div>
              )}
            </section>

            {/* PREVIEW ORDEN */}
            {!stepStarted && (
              <>
                <div className="mono">
                  {resumenInicialPreop({
                    datos,
                    comorb: comorbilidades,
                    tipoCirugia,
                  })}
                </div>
                <button
                  className="btn fullw"
                  style={{ marginTop: 10 }}
                  onClick={handleGenerarIA}
                  disabled={loadingIA}
                >
                  {loadingIA ? "Generando con IA…" : "Aceptar y continuar"}
                </button>
              </>
            )}

            {/* PREVIEW IA */}
            {stepStarted && (
              <>
                {prettyComorb(comorbilidades).length > 0 && (
                  <section className="mt-8">
                    <strong>Comorbilidades:</strong>
                    <div className="chips mt-6">
                      {prettyComorb(comorbilidades).map((t, i) => (
                        <span className="chip" key={i}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {Array.isArray(examenesIA) && examenesIA.length > 0 && (
                  <section className="mt-12">
                    <strong>Exámenes a solicitar (IA):</strong>
                    <ul className="mt-6">
                      {examenesIA.map((e, i) => (
                        <li key={i}>{typeof e === "string" ? e : e?.nombre}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {informeIA && (
                  <section className="mt-8">
                    <strong>Informe IA:</strong>
                    <div className="mono mt-6">{informeIA}</div>
                  </section>
                )}

                {pagoRealizado ? (
                  <button
                    className="btn fullw mt-12"
                    onClick={handleDescargarPreop}
                    disabled={descargando}
                  >
                    {descargando
                      ? mensajeDescarga || "Descargando…"
                      : "Descargar Documento"}
                  </button>
                ) : (
                  <button
                    className="btn fullw mt-12"
                    onClick={handlePagarDesdePreview}
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
