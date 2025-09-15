"use client";
import React, { useState, useEffect, useRef } from "react";

/* Esquema corporal */
import EsquemaAnterior from "./EsquemaAnterior.jsx";
import EsquemaPosterior from "./EsquemaPosterior.jsx";
import EsquemaToggleTabs from "./EsquemaToggleTabs.jsx";

/* Formularios y módulos */
import FormularioPaciente from "./FormularioPaciente.jsx";
import PreviewOrden from "./PreviewOrden.jsx"; // PRIMER preview (resumen + comorbilidades)
import PreviewIA from "./PreviewIA.jsx";       // SEGUNDO preview (resultado IA + pagar)
import PreopModulo from "./modules/PreopModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import IAModulo from "./modules/IAModulo.jsx";

/* Utilidades existentes */
import { irAPagoKhipu } from "./PagoKhipu.jsx";
import AvisoLegal from "./components/AvisoLegal.jsx";
import FormularioResonancia from "./components/FormularioResonancia.jsx";
import FormularioComorbilidades from "./components/FormularioComorbilidades.jsx";

/* Tema */
import { getTheme } from "./theme.js";
const T = getTheme();

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* Normaliza sólo para el backend */
const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

function App() {
  /* ====== Estado base ====== */
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: "",
    rut: "",
    edad: "",
    genero: "",
    dolor: "",
    lado: "",
  });

  // 'trauma' | 'preop' | 'generales' | 'ia'
  const [modulo, setModulo] = useState("trauma");

  // Vista esquema (anterior/posterior)
  const [vista, setVista] = useState("anterior");

  // Previews
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  // Sólo para preop/generales: 'resumen' (primer preview) → 'ia' (segundo preview)
  const [step, setStep] = useState("resumen");

  // Pago / descarga (legacy que ya usabas)
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Aviso legal
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [pendingPreview, setPendingPreview] = useState(false); // IA lista pero esperando aceptar aviso

  // Comorbilidades
  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);
  const [comorbilidades, setComorbilidades] = useState(() => {
    try {
      const raw = sessionStorage.getItem("preop_comorbilidades_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Flags de aceptación (persistidos por módulo)
  const avisoOkRef = useRef({ preop: false, generales: false });
  const comorbOkRef = useRef({ preop: false, generales: false });

  const getComorbStorageKey = (scope) =>
    scope === "generales" ? "generales_comorbilidades_data" : "preop_comorbilidades_data";
  const getAvisoKey = (scope) =>
    scope === "generales" ? "generales_aviso_ok" : "preop_aviso_ok";
  const getComorbOkKey = (scope) =>
    scope === "generales" ? "generales_comorbilidades_ok" : "preop_comorbilidades_ok";

  const marcarAvisoOk = (scope) => {
    avisoOkRef.current[scope] = true;
    try { sessionStorage.setItem(getAvisoKey(scope), "1"); } catch {}
  };
  const marcarComorbilidadesOk = (scope, payload) => {
    comorbOkRef.current[scope] = true;
    try {
      sessionStorage.setItem(getComorbOkKey(scope), "1");
      sessionStorage.setItem(getComorbStorageKey(scope), JSON.stringify(payload || {}));
    } catch {}
  };

  /* ====== Restauración / persistencia ====== */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatosPaciente(JSON.parse(saved));

      const m = sessionStorage.getItem("modulo");
      if (["trauma", "preop", "generales", "ia"].includes(m)) setModulo(m);

      avisoOkRef.current.preop = sessionStorage.getItem("preop_aviso_ok") === "1";
      avisoOkRef.current.generales = sessionStorage.getItem("generales_aviso_ok") === "1";
      comorbOkRef.current.preop = sessionStorage.getItem("preop_comorbilidades_ok") === "1";
      comorbOkRef.current.generales = sessionStorage.getItem("generales_comorbilidades_ok") === "1";

      const vistaSS = sessionStorage.getItem("vistaEsquema");
      if (vistaSS === "anterior" || vistaSS === "posterior") setVista(vistaSS);
    } catch {}
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datosPaciente)); } catch {}
  }, [datosPaciente]);

  useEffect(() => {
    try { sessionStorage.setItem("vistaEsquema", vista); } catch {}
  }, [vista]);

  // Mantener comorbilidades del scope al cambiar de módulo
  useEffect(() => {
    if (modulo !== "preop" && modulo !== "generales") return;
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey(modulo));
      setComorbilidades(raw ? JSON.parse(raw) : null);
    } catch { setComorbilidades(null); }
  }, [modulo]);

  /* ====== Esquema: selección de zona ====== */
  const onSeleccionZona = (zona) => {
    let dolor = "", lado = "";
    if (zona.includes("Columna")) { dolor = "Columna lumbar"; lado = ""; }
    else if (zona.includes("Cadera")) { dolor = "Cadera"; lado = zona.includes("izquierda") ? "Izquierda" : "Derecha"; }
    else if (zona.includes("Rodilla")) { dolor = "Rodilla"; lado = zona.includes("izquierda") ? "Izquierda" : "Derecha"; }
    setDatosPaciente((p) => ({ ...p, dolor, lado }));
  };

  /* ====== Submit principal ====== */
  const handleSubmit = (e) => {
    e.preventDefault();
    const edadNum = Number(datosPaciente.edad);

    if (!datosPaciente.nombre?.trim() || !datosPaciente.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0) {
      alert("Por favor complete nombre, RUT y edad (>0).");
      return;
    }
    if (modulo === "trauma" && !datosPaciente.dolor?.trim()) {
      alert("Seleccione dolor/zona en el esquema para continuar.");
      return;
    }

    if (modulo === "preop" || modulo === "generales") {
      const scope = modulo;
      if (!comorbOkRef.current[scope]) {
        setMostrarComorbilidades(true); // abrir de inmediato
        return;
      }
      // Primer preview (resumen sin IA todavía)
      setMostrarVistaPrevia(true);
      setPagoRealizado(false);
      setMostrarPago(false);
      setStep("resumen");
      return;
    }

    // Otros módulos (trauma/ia): preview directo (usa componente de segundo preview)
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
    setStep("ia");
  };

  /* ====== Guardar comorbilidades → Primer preview ====== */
  const handleSaveComorbilidades = (payload) => {
    setComorbilidades(payload);
    setMostrarComorbilidades(false);
    const scope = modulo === "generales" ? "generales" : "preop";
    marcarComorbilidadesOk(scope, payload);

    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
    setStep("resumen");
  };

  /* ====== Aviso Legal ====== */
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    if (modulo === "preop" || modulo === "generales") marcarAvisoOk(modulo);
    if (pendingPreview) {
      setMostrarVistaPrevia(true);
      setPagoRealizado(false);
      setMostrarPago(false);
      setStep("ia");
      setPendingPreview(false);
    }
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    setPendingPreview(false);
  };

  /* ====== Llamadas IA ====== */
  const llamarPreopIA = async () => {
    // Asegurar idPago
    let idPago = sessionStorage.getItem("idPago") || "";
    if (!idPago) {
      idPago = `preop_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
      sessionStorage.setItem("idPago", idPago);
    }

    // Tipo de cirugía
    let tipoCirugia = "";
    try {
      const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
      const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      tipoCirugia = fijo || otro || "";
    } catch {}

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = { ...datosPaciente, edad: edadNum, genero: normalizarGenero(datosPaciente.genero) };

    const postIA = async (path, body) =>
      fetch(`${BACKEND_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    const body = { idPago, paciente, comorbilidades: comorbilidades || {}, tipoCirugia };

    try {
      let r = await postIA("/preop-ia", body);
      if (!r.ok) r = await postIA("/ia-preop", body);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();
      const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
      const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";
      try {
        sessionStorage.setItem("preop_ia_examenes", JSON.stringify(examenes));
        sessionStorage.setItem("preop_ia_resumen", resumen || "");
      } catch {}

      if (avisoOkRef.current.preop) {
        setStep("ia");
      } else {
        setPendingPreview(true);
        setMostrarAviso(true);
      }
    } catch {
      alert("No fue posible obtener la información de IA (Preoperatorio).");
    }
  };

  const llamarGeneralesIA = async () => {
    // Asegurar idPago
    let idPago = sessionStorage.getItem("idPago") || "";
    if (!idPago) {
      idPago = `generales_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
      sessionStorage.setItem("idPago", idPago);
    }

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = { ...datosPaciente, edad: edadNum, genero: normalizarGenero(datosPaciente.genero) };
    const body = { idPago, paciente, comorbilidades: comorbilidades || {} };

    try {
      let r = await fetch(`${BACKEND_BASE}/ia-generales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        r = await fetch(`${BACKEND_BASE}/preop-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });
      }
      if (!r.ok) {
        r = await fetch(`${BACKEND_BASE}/ia-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();
      const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
      const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";
      try {
        sessionStorage.setItem("generales_ia_examenes", JSON.stringify(examenes));
        sessionStorage.setItem("generales_ia_resumen", resumen || "");
      } catch {}

      if (avisoOkRef.current.generales) {
        setStep("ia");
      } else {
        setPendingPreview(true);
        setMostrarAviso(true);
      }
    } catch {
      alert("No fue posible obtener la información de IA (Generales).");
    }
  };

  // Botón "Continuar" del primer preview
  const onContinuarPrimerPreview = async () => {
    if (modulo === "preop") await llamarPreopIA();
    else if (modulo === "generales") await llamarGeneralesIA();
  };

  /* ====== Resonancia / Pago / PDF (legacy) ====== */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esResonanciaTexto = (t = "") => {
    const s = (t || "").toLowerCase();
    return s.includes("resonancia") || s.includes("resonancia magn") || /\brm\b/i.test(t);
  };

  const detectarResonanciaEnBackend = async (datos) => {
    try {
      const r = await fetch(`${BACKEND_BASE}/detectar-resonancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datosPaciente: datos }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const flag =
        typeof j?.resonancia === "boolean"
          ? j.resonancia
          : esResonanciaTexto(j?.texto || j?.orden || "");
      sessionStorage.setItem("solicitaResonancia", flag ? "1" : "0");
      return !!flag;
    } catch {
      sessionStorage.setItem("solicitaResonancia", "0");
      return false;
    }
  };

  const [showReso, setShowReso] = useState(false);
  const [resolverReso, setResolverReso] = useState(null);
  const RED_FLAGS = new Set([
    "marcapasos",
    "coclear_o_neuro",
    "clips_aneurisma",
    "valvula_cardiaca_metal",
    "fragmentos_metalicos",
  ]);
  const pedirChecklistResonancia = () =>
    new Promise((resolve) => {
      setResolverReso(() => resolve);
      setShowReso(true);
    });
  const hasRedFlags = (data) =>
    Object.entries(data || {}).some(([k, v]) => RED_FLAGS.has(k) && v === true);
  const resumenResoTexto = (data) => {
    const si =
      Object.entries(data || {}).filter(([, v]) => v === true).map(([k]) => k).join(", ") || "—";
    const no =
      Object.entries(data || {}).filter(([, v]) => v === false).map(([k]) => k).join(", ") || "—";
    return [
      "FORMULARIO DE SEGURIDAD PARA RESONANCIA MAGNÉTICA",
      `Sí: ${si}`,
      `No: ${no}`,
      "Declaro que la información es veraz y autorizo la realización del examen.",
      "Firma Paciente: ______________________     RUT: _______________     Fecha: ____/____/______",
    ].join("\n");
  };

  const handleDescargarPDF = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) { alert("ID de pago no encontrado"); return; }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orden_${(datosPaciente.nombre || "paciente").replace(/ /g, "_")}.pdf`;
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
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datosPaciente;
            await fetch(`${BACKEND_BASE}/guardar-datos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idPago, datosPaciente: datosReinyectar }),
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
    } catch {
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  const handlePagarAhora = async () => {
    const edadNum = Number(datosPaciente.edad);
    if (
      !datosPaciente.nombre?.trim() ||
      !datosPaciente.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datosPaciente.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return;
    }

    try {
      const idPagoTmp =
        sessionStorage.getItem("idPago") ||
        "pago_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

      sessionStorage.setItem("idPago", idPagoTmp);
      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({ ...datosPaciente, edad: edadNum })
      );

      const solicitarRM = await detectarResonanciaEnBackend({
        ...datosPaciente,
        edad: edadNum,
      });

      if (solicitarRM) {
        const data = await pedirChecklistResonancia();
        setShowReso(false);
        if (typeof resolverReso === "function") resolverReso(data);
        if (hasRedFlags(data)) {
          alert("Se detectaron contraindicaciones para RM. Revise el checklist.");
          return;
        }
        const texto = resumenResoTexto(data);
        try { sessionStorage.setItem("formularioResonanciaTexto", texto); } catch {}
      }

      irAPagoKhipu(modulo, { ...datosPaciente, edad: edadNum });
      setMostrarPago(true);
    } catch {
      alert("No fue posible iniciar el pago.");
    }
  };

  /* ====== Render ====== */
  return (
    <div className="min-h-screen w-full bg-[--bg] text-[--fg]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-semibold mb-4">Asistente Virtual para Pacientes</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="rounded-xl shadow-md bg-white p-4">
            {/* OJO: FormularioPaciente de tu proyecto acepta (value, onChange) con objeto completo */}
            <FormularioPaciente value={datosPaciente} onChange={setDatosPaciente} />

            <div className="mt-4">
              <EsquemaToggleTabs onChange={setVista} value={vista} />
              {vista === "anterior" ? (
                <EsquemaAnterior onSeleccionZona={onSeleccionZona} />
              ) : (
                <EsquemaPosterior onSeleccionZona={onSeleccionZona} />
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-md px-4 py-2 bg-gray-800 text-white hover:opacity-90"
              >
                Generar informe
              </button>
            </form>
          </div>

          {/* Columna derecha: PREVIEWS */}
          <div className="rounded-xl shadow-md bg-white p-4">
            {mostrarVistaPrevia && (
              (modulo === "preop" || modulo === "generales") ? (
                step === "resumen" ? (
                  <PreviewOrden
                    scope={modulo}
                    datos={datosPaciente}
                    onContinuar={onContinuarPrimerPreview}
                  />
                ) : (
                  <PreviewIA
                    scope={modulo}
                    datos={datosPaciente}
                    onPagar={handlePagarAhora}
                  />
                )
              ) : (
                // TRAUMA e IA usan el segundo preview (no tocamos su flujo)
                <PreviewIA
                  scope={modulo}
                  datos={datosPaciente}
                  onPagar={handlePagarAhora}
                />
              )
            )}
          </div>
        </div>

        {/* Aviso legal */}
        {mostrarAviso && (
          <div className="mt-6">
            <AvisoLegal onAceptar={continuarTrasAviso} onCancelar={rechazarAviso} />
          </div>
        )}

        {/* Modal Comorbilidades */}
        {mostrarComorbilidades && (
          <div className="mt-6">
            <FormularioComorbilidades
              initialValue={comorbilidades}
              onSave={handleSaveComorbilidades}
              onCancel={() => setMostrarComorbilidades(false)}
              scope={modulo === "generales" ? "generales" : "preop"}
            />
          </div>
        )}

        {/* Checklist Resonancia (cuando aplique) */}
        {showReso && (
          <div className="mt-6">
            <FormularioResonancia
              onClose={(data) => {
                setShowReso(false);
                if (typeof resolverReso === "function") resolverReso(data);
              }}
            />
          </div>
        )}

        {/* Acciones post-pago / descarga */}
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <button
            onClick={handleDescargarPDF}
            disabled={descargando}
            className="rounded-md px-4 py-2 bg-gray-200 hover:bg-gray-300"
          >
            {descargando ? mensajeDescarga || "Descargando…" : "Descargar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
