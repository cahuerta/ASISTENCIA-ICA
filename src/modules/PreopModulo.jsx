"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

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

// Opciones comunes de tipo de cirugía (puedes ajustar los textos)
const TIPOS_CIRUGIA = [
  "Artroplastia total de cadera (ATC)",
  "Artroplastia total de rodilla (ATR)",
  "Artroscopia de rodilla",
  "Osteotomía (cadera/rodilla)",
  "Cirugía menor de partes blandas",
  "Otro (especificar)",
];

export default function PreopModulo({ initialDatos }) {
  // ======== Estados base existentes
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // ======== Estados nuevos para el flujo
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

  // ======== Montaje: sincroniza datos, detecta retorno de pago
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
      // warm-up backend preop
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

  // =============== Paso 0: Continuar (abre Comorbilidades)
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

    // Genera/recupera idPago y persistencias base
    const idPago =
      sessionStorage.getItem("idPago") ||
      ("preop_" + Date.now() + "_" + Math.floor(Math.random() * 10000));
    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "preop");
    sessionStorage.setItem(
      "datosPacienteJSON",
      JSON.stringify({ ...datos, edad: edadNum })
    );

    // Guarda preop base (sin IA aún)
    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
        }),
      });
    } catch (e) {
      console.warn("No se pudo hacer el guardado inicial PREOP (seguimos):", e);
    }

    setPaso("comorbilidades");
  };

  // =============== Paso 1: Enviar Comorbilidades
  const handleEnviarComorbilidades = async (formData) => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const limpio = normalizarComorbilidades(formData);
    setComorbilidades(limpio);
    sessionStorage.setItem(`preop_comorbilidades_${idPago}`, JSON.stringify(limpio));

    // Extiende en backend
    try {
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos },
          comorbilidades: limpio,
        }),
      });
    } catch (e) {
      console.warn("No se pudo guardar comorbilidades (continuamos):", e);
    }

    setPaso("cirugia");
  };

  // =============== Paso 2: Confirmar Tipo de Cirugía
  const handleConfirmarCirugia = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    let seleccion = tipoCirugia;
    if (!seleccion) {
      alert("Seleccione el tipo de cirugía.");
      return;
    }
    if (seleccion.startsWith("Otro") && !tipoCirugiaLibre.trim()) {
      alert("Especifique el tipo de cirugía en 'Otro'.");
      return;
    }
    if (seleccion.startsWith("Otro")) seleccion = tipoCirugiaLibre.trim();

    setTipoCirugia(seleccion);
    sessionStorage.setItem(`preop_tipoCirugia_${idPago}`, seleccion);

    // Guardar también en backend
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
    } catch (e) {
      console.warn("No se pudo guardar tipo de cirugía (continuamos):", e);
    }

    // Llamar IA
    await llamarIAyConstruirPreview();
  };

  // =============== Paso 3: IA → genera examenes/informe → PREVIEW
  const llamarIAyConstruirPreview = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

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
        catalogoExamenes: EXAMENES_FIJOS, // para que la IA respete los nombres
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
        examenes = limpiarListaExamenesContraCatalogo(
          data?.examenes,
          EXAMENES_FIJOS
        );
        informe = (data?.informeIA || "").toString();
      } else {
        console.warn("IA-Preop no OK, fallback a base.");
      }

      // Persistir resultados (o fallback)
      const finalExamenes = (examenes && examenes.length) ? examenes : EXAMENES_FIJOS;
      const finalInforme = informe || "Informe IA no disponible por el momento.";

      setExamenesIA(finalExamenes);
      setInformeIA(finalInforme);

      sessionStorage.setItem(
        `preop_examenes_IA_${idPago}`,
        JSON.stringify(finalExamenes)
      );
      sessionStorage.setItem(`preop_informe_IA_${idPago}`, finalInforme);

      // Guardar en backend
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
      } catch (e) {
        console.warn("No se pudo guardar resultados IA (seguimos):", e);
      }

      setPaso("preview");
    } catch (e) {
      console.error("Fallo IA-Preop:", e);
      // Fallback directo
      const idPago = sessionStorage.getItem("idPago");
      setExamenesIA(EXAMENES_FIJOS);
      setInformeIA("Informe IA no disponible por el momento.");

      if (idPago) {
        sessionStorage.setItem(
          `preop_examenes_IA_${idPago}`,
          JSON.stringify(EXAMENES_FIJOS)
        );
        sessionStorage.setItem(
          `preop_informe_IA_${idPago}`,
          "Informe IA no disponible por el momento."
        );
      }
      setPaso("preview");
    }
  };

  // =============== Paso 4: Pago (solo desde PREVIEW)
  const handlePagarDesdePreview = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    try {
      // aseguramos persistencia previa
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

  // =============== Descargar PDF
  const handleDescargarPreop = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, {
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
          if (i === maxIntentos)
            alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
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

  // =============== Simular Pago (guest)
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

    // redirige simulando retorno pagado
    const url = new URL(window.location.href);
    url.searchParams.set("pago", "ok");
    url.searchParams.set("idPago", idPago);
    window.location.href = url.toString();
  };

  // =================== UI ===================
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
          {`Dolor en ${(datos?.dolor || "")}${datos?.lado ? ` ${datos.lado}` : ""}`.trim() ||
            "—"}
        </div>
      </div>

      {/* Bloque PREVIEW (si ya hay resultados o paso = preview) */}
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
                title="Comenzar: Comorbilidades → Tipo de cirugía → IA → Preview"
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
            <FormularioComorbilidadesInline
              initialValues={comorbilidades}
              onCancel={() => setPaso("idle")}
              onSubmit={handleEnviarComorbilidades}
            />
          )}

          {paso === "cirugia" && (
            <SelectorTipoCirugia
              tipos={TIPOS_CIRUGIA}
              value={tipoCirugia}
              otroTexto={tipoCirugiaLibre}
              onChange={(v) => setTipoCirugia(v)}
              onChangeOtro={(t) => setTipoCirugiaLibre(t)}
              onBack={() => setPaso("comorbilidades")}
              onConfirm={handleConfirmarCirugia}
            />
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

/* ================== Subcomponentes simples (inline) ================== */

// Form comorbilidades rápido, sin dependencias externas.
// Puedes reemplazarlo por tu FormularioComorbilidades.jsx si prefieres.
function FormularioComorbilidadesInline({ initialValues = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    antecedentes: initialValues.antecedentes || {
      HTA: false,
      DM: false,
      Cardiopatia: false,
      EPOC_ASMA: false,
      Renal: false,
      Tiroideo: false,
      Obesidad: false,
      SAHOS: false,
      Reumatologico: false,
      Cancer: false,
    },
    cirugiasPrevias: initialValues.cirugiasPrevias || "",
    alergias: initialValues.alergias || "",
    medicamentos: initialValues.medicamentos || "",
    anticoagulantes: initialValues.anticoagulantes || { usa: false, detalle: "" },
    tabaco: initialValues.tabaco || "",
    alcohol: initialValues.alcohol || "",
    observaciones: initialValues.observaciones || "",
  });

  const toggleAnt = (k) =>
    setForm((f) => ({
      ...f,
      antecedentes: { ...f.antecedentes, [k]: !f.antecedentes[k] },
    }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(form);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalCard}>
        <h4 style={{ marginTop: 0 }}>Formulario de Comorbilidades</h4>

        <div style={styles.grid2}>
          <div>
            <strong>Antecedentes médicos</strong>
            <div style={styles.chips}>
              {Object.keys(form.antecedentes).map((k) => (
                <label key={k} style={styles.chip}>
                  <input
                    type="checkbox"
                    checked={!!form.antecedentes[k]}
                    onChange={() => toggleAnt(k)}
                  />
                  <span style={{ marginLeft: 6 }}>{k}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label>Cirugías previas</label>
            <textarea
              name="cirugiasPrevias"
              value={form.cirugiasPrevias}
              onChange={handleChange}
              rows={3}
              style={styles.input}
            />
          </div>

          <div>
            <label>Alergias</label>
            <textarea
              name="alergias"
              value={form.alergias}
              onChange={handleChange}
              rows={2}
              style={styles.input}
            />
          </div>

          <div>
            <label>Medicamentos actuales (nombre – dosis – frecuencia)</label>
            <textarea
              name="medicamentos"
              value={form.medicamentos}
              onChange={handleChange}
              rows={3}
              style={styles.input}
            />
          </div>

          <div>
            <label>Anticoagulantes/antiagregantes</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!form.anticoagulantes.usa}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      anticoagulantes: { ...f.anticoagulantes, usa: e.target.checked },
                    }))
                  }
                />
                <span style={{ marginLeft: 6 }}>Usa</span>
              </label>
              <input
                placeholder="Cuál/es"
                value={form.anticoagulantes.detalle || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    anticoagulantes: { ...f.anticoagulantes, detalle: e.target.value },
                  }))
                }
                style={{ ...styles.input, flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label>Tabaquismo</label>
            <input
              name="tabaco"
              value={form.tabaco}
              onChange={handleChange}
              placeholder="No / Ex / Actual (frecuencia)"
              style={styles.input}
            />
          </div>

          <div>
            <label>Alcohol</label>
            <input
              name="alcohol"
              value={form.alcohol}
              onChange={handleChange}
              placeholder="No / Ocasional / Frecuente"
              style={styles.input}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={3}
              style={styles.input}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ ...styles.btn, background: "#777" }} onClick={onCancel}>
            Cancelar
          </button>
          <button
            style={{ ...styles.btn, background: "#004B94" }}
            onClick={handleSubmit}
          >
            Guardar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectorTipoCirugia({
  tipos,
  value,
  otroTexto,
  onChange,
  onChangeOtro,
  onBack,
  onConfirm,
}) {
  return (
    <div style={styles.modal}>
      <div style={styles.modalCard}>
        <h4 style={{ marginTop: 0 }}>Seleccione tipo de cirugía</h4>
        <div style={{ display: "grid", gap: 8 }}>
          {tipos.map((t) => (
            <label key={t} style={styles.radioRow}>
              <input
                type="radio"
                name="tipoCirugia"
                value={t}
                checked={value === t}
                onChange={(e) => onChange(e.target.value)}
              />
              <span style={{ marginLeft: 8 }}>{t}</span>
            </label>
          ))}
          {value?.startsWith("Otro") && (
            <input
              placeholder="Especifique el tipo de cirugía"
              value={otroTexto}
              onChange={(e) => onChangeOtro(e.target.value)}
              style={styles.input}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ ...styles.btn, background: "#777" }} onClick={onBack}>
            Volver
          </button>
          <button
            style={{ ...styles.btn, background: "#004B94" }}
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================== Helpers ================== */

function normalizarComorbilidades(c) {
  if (!c) return {};
  // Asegura estructura mínima esperada
  return {
    antecedentes: c.antecedentes || {},
    cirugiasPrevias: (c.cirugiasPrevias || "").toString(),
    alergias: (c.alergias || "").toString(),
    medicamentos: (c.medicamentos || "").toString(),
    anticoagulantes: c.anticoagulantes || { usa: false, detalle: "" },
    tabaco: (c.tabaco || "").toString(),
    alcohol: (c.alcohol || "").toString(),
    observaciones: (c.observaciones || "").toString(),
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
      // Devuelve con la capitalización del catálogo original
      const original = catalogo.find((c) => c.toUpperCase() === nombre);
      clean.push(original);
    }
  }
  // evita devolver vacío
  return clean.length ? clean : null;
}

/* ================== Estilos ================== */

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
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #D8DFEA",
    borderRadius: 8,
    fontSize: 14,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    background: "#F2F6FB",
    border: "1px solid #E3E9F2",
    borderRadius: 20,
    padding: "6px 10px",
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
  },
  radioRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 8px",
    border: "1px solid #E3E9F2",
    borderRadius: 8,
  },
};
