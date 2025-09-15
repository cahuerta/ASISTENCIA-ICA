"use client";
import React, { useState, useEffect, useRef } from "react";

/* Esquema corporal */
import EsquemaAnterior from "./EsquemaAnterior.jsx";
import EsquemaPosterior from "./EsquemaPosterior.jsx";
import EsquemaToggleTabs from "./EsquemaToggleTabs.jsx";

/* Formularios y módulos */
import FormularioPaciente from "./FormularioPaciente.jsx";
import PreviewOrden from "./PreviewOrden.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import IAModulo from "./modules/IAModulo.jsx";

/* Utilidades existentes */
import { irAPagoKhipu } from "./PagoKhipu.jsx";
import AvisoLegal from "./components/AvisoLegal.jsx";
import FormularioResonancia from "./components/FormularioResonancia.jsx";
import FormularioComorbilidades from "./components/FormularioComorbilidades.jsx";

/* Tema (JSON + helper) */
import { getTheme } from "./theme.js";
const T = getTheme();

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ===== Catálogo para IA de GENERALES ===== */
const CATALOGO_GENERALES = [
  "HEMOGRAMA",
  "VHS",
  "PCR",
  "ELECTROLITOS PLASMATICOS",
  "PERFIL BIOQUIMICO",
  "PERFIL LIPIDICO",
  "PERFIL HEPATICO",
  "CREATININA",
  "TTPK",
  "HEMOGLOBINA GLICOSILADA",
  "VITAMINA D",
  "ORINA",
  "UROCULTIVO",
  "ECG DE REPOSO",
  "ANTÍGENO PROSTÁTICO",
  "CEA",
  "MAMOGRAFÍA",
  "TSHm y T4 LIBRE",
  "CALCIO",
  "PAPANICOLAO (según edad)",
];

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: "",
    rut: "",
    edad: "",
    genero: "",
    dolor: "",
    lado: "",
  });

  // Módulo activo: 'trauma' | 'preop' | 'generales' | 'ia'
  const [modulo, setModulo] = useState("trauma");

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Vista esquema (frontal/posterior)
  const [vista, setVista] = useState("anterior");

  // ====== Flags persistentes (por módulo: preop / generales) ======
  const avisoOkRef = useRef({ preop: false, generales: false });
  const comorbOkRef = useRef({ preop: false, generales: false });

  const getComorbStorageKey = (scope) =>
    scope === "generales" ? "generales_comorbilidades_data" : "preop_comorbilidades_data";
  const getAvisoKey = (scope) =>
    scope === "generales" ? "generales_aviso_ok" : "preop_aviso_ok";
  const getComorbOkKey = (scope) =>
    scope === "generales" ? "generales_comorbilidades_ok" : "preop_comorbilidades_ok";

  useEffect(() => {
    try {
      avisoOkRef.current.preop = sessionStorage.getItem("preop_aviso_ok") === "1";
      avisoOkRef.current.generales = sessionStorage.getItem("generales_aviso_ok") === "1";

      comorbOkRef.current.preop = sessionStorage.getItem("preop_comorbilidades_ok") === "1";
      comorbOkRef.current.generales = sessionStorage.getItem("generales_comorbilidades_ok") === "1";
    } catch {}
  }, []);

  const marcarAvisoOk = (scope) => {
    avisoOkRef.current[scope] = true;
    try {
      sessionStorage.setItem(getAvisoKey(scope), "1");
    } catch {}
  };

  const marcarComorbilidadesOk = (scope, payload) => {
    comorbOkRef.current[scope] = true;
    try {
      sessionStorage.setItem(getComorbOkKey(scope), "1");
      sessionStorage.setItem(getComorbStorageKey(scope), JSON.stringify(payload || {}));
    } catch {}
  };

  // ====== Aviso Legal ======
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [pendingPreview, setPendingPreview] = useState(false); // preview sólo tras IA + aceptar

  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    if (modulo === "preop" || modulo === "generales") marcarAvisoOk(modulo);
    if (pendingPreview) {
      setMostrarVistaPrevia(true);
      setPagoRealizado(false);
      setMostrarPago(false);
      setPendingPreview(false);
    }
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    setPendingPreview(false);
    try {
      window.close();
    } catch {}
    setTimeout(() => {
      if (!window.closed) window.location.href = "about:blank";
    }, 0);
  };

  // ====== RNM (checklist) ======
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
      Object.entries(data || {})
        .filter(([_, v]) => v === true)
        .map(([k]) => k)
        .join(", ") || "—";
    const no =
      Object.entries(data || {})
        .filter(([_, v]) => v === false)
        .map(([k]) => k)
        .join(", ") || "—";
    return [
      "FORMULARIO DE SEGURIDAD PARA RESONANCIA MAGNÉTICA",
      `Sí: ${si}`,
      `No: ${no}`,
      "Declaro que la información es veraz y autorizo la realización del examen.",
      "Firma Paciente: ______________________     RUT: _______________     Fecha: ____/____/______",
    ].join("\n");
  };

  // ====== Comorbilidades (modal suelto) ======
  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);
  const [comorbilidades, setComorbilidades] = useState(() => {
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey("preop"));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Mantener comorbilidades del scope al cambiar de módulo
  useEffect(() => {
    if (modulo !== "preop" && modulo !== "generales") return;
    try {
      const raw = sessionStorage.getItem(getComorbStorageKey(modulo));
      setComorbilidades(raw ? JSON.parse(raw) : null);
    } catch {
      setComorbilidades(null);
    }
  }, [modulo]);

  // ---- IA PREOP ----
  const llamarPreopIA = async (payloadComorb) => {
    // Asegurar idPago
    let idPago = "";
    try {
      idPago = sessionStorage.getItem("idPago") || "";
      if (!idPago) {
        idPago = `preop_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
        sessionStorage.setItem("idPago", idPago);
      }
    } catch {}

    // Tipo de cirugía desde sessionStorage
    let tipoCirugia = "";
    try {
      const fijo = sessionStorage.getItem("preop_tipoCirugia") || "";
      const otro = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      tipoCirugia = fijo || otro || "";
    } catch {}

    // Comorbilidades
    let comorb = payloadComorb || comorbilidades;
    if (!comorb) {
      try {
        const raw = sessionStorage.getItem(getComorbStorageKey("preop"));
        if (raw) comorb = JSON.parse(raw);
      } catch {}
    }

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;

    const postIA = async (path) =>
      fetch(`${BACKEND_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          paciente: { ...datosPaciente, edad: edadNum },
          comorbilidades: comorb || {},
          tipoCirugia,
        }),
      });

    try {
      let resp = await postIA("/preop-ia");
      if (!resp.ok) resp = await postIA("/ia-preop");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const j = await resp.json();
      const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
      const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";

      try {
        sessionStorage.setItem("preop_ia_examenes", JSON.stringify(examenes));
        sessionStorage.setItem("preop_ia_resumen", resumen || "");
      } catch {}

      // Mostrar preview directo si Aviso ya aceptado; si no, abrirlo (una vez)
      if (avisoOkRef.current.preop) {
        setMostrarVistaPrevia(true);
        setPagoRealizado(false);
        setMostrarPago(false);
        setPendingPreview(false);
      } else {
        setPendingPreview(true);
        setMostrarAviso(true);
      }
    } catch (err) {
      alert("No fue posible obtener la información de IA desde el backend. Intenta nuevamente.");
      setPendingPreview(false);
    }
  };

  // ---- IA GENERALES (reutiliza preopIA del backend + catálogo) ----
  const llamarGeneralesIA = async (payloadComorb) => {
    // Asegurar idPago
    let idPago = "";
    try {
      idPago = sessionStorage.getItem("idPago") || "";
      if (!idPago) {
        idPago = `generales_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
        sessionStorage.setItem("idPago", idPago);
      }
    } catch {}

    // Comorbilidades
    let comorb = payloadComorb || comorbilidades;
    if (!comorb) {
      try {
        const raw = sessionStorage.getItem(getComorbStorageKey("generales"));
        if (raw) comorb = JSON.parse(raw);
      } catch {}
    }

    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;

    const body = {
      idPago,
      paciente: { ...datosPaciente, edad: edadNum },
      comorbilidades: comorb || {},
      tipoCirugia: "", // Generales no usa cirugía
      catalogoExamenes: CATALOGO_GENERALES,
    };

    const postIA = async (path) =>
      fetch(`${BACKEND_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    try {
      let resp = await postIA("/preop-ia");
      if (!resp.ok) resp = await postIA("/ia-preop");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const j = await resp.json();
      const examenes = Array.isArray(j?.examenes) ? j.examenes : [];
      const resumen = typeof j?.informeIA === "string" ? j.informeIA : "";

      try {
        sessionStorage.setItem("generales_ia_examenes", JSON.stringify(examenes));
        sessionStorage.setItem("generales_ia_resumen", resumen || "");
      } catch {}

      if (avisoOkRef.current.generales) {
        setMostrarVistaPrevia(true);
        setPagoRealizado(false);
        setMostrarPago(false);
        setPendingPreview(false);
      } else {
        setPendingPreview(true);
        setMostrarAviso(true);
      }
    } catch (err) {
      alert("No fue posible obtener la información de IA desde el backend. Intenta nuevamente.");
      setPendingPreview(false);
    }
  };

  // Guardar comorbilidades → marcar ok → llamar IA del scope
  const handleSaveComorbilidades = async (payload) => {
    setComorbilidades(payload);
    setMostrarComorbilidades(false);
    const scope = modulo === "generales" ? "generales" : "preop";
    marcarComorbilidadesOk(scope, payload);
    if (scope === "preop") await llamarPreopIA(payload);
    else await llamarGeneralesIA(payload);
  };

  // ====== Restauración de estado en montaje ======
  useEffect(() => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    if (saved) {
      try {
        setDatosPaciente(JSON.parse(saved));
      } catch {}
    }

    const moduloSS = sessionStorage.getItem("modulo");
    if (["trauma", "preop", "generales", "ia"].includes(moduloSS)) {
      setModulo(moduloSS);
    }

    const vistaSS = sessionStorage.getItem("vistaEsquema");
    if (vistaSS === "anterior" || vistaSS === "posterior") setVista(vistaSS);

    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPagoURL = params.get("idPago");
    const idPagoSS = sessionStorage.getItem("idPago");
    const idFinal = idPagoURL || idPagoSS || "";

    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (pago === "ok" && idFinal) {
      sessionStorage.setItem("idPago", idFinal);
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);

      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`);
        } catch {}
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }, 2000);
    } else if (!pago && idFinal) {
      setMostrarPago(false);
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
    } else if (pago === "ok" && !idFinal) {
      alert("No recibimos idPago en el retorno. Intenta nuevamente.");
    } else if (pago === "cancelado") {
      alert("Pago cancelado.");
      setMostrarPago(false);
      setMostrarVistaPrevia(false);
      setPagoRealizado(false);
    }

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, []);

  // Persistir vista de esquema
  useEffect(() => {
    try {
      sessionStorage.setItem("vistaEsquema", vista);
    } catch {}
  }, [vista]);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => {
      const next = { ...prev, [campo]: valor };
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const onSeleccionZona = (zona) => {
    let dolor = "";
    let lado = "";
    if (zona.includes("Columna")) {
      dolor = "Columna lumbar";
      lado = "";
    } else if (zona.includes("Cadera")) {
      dolor = "Cadera";
      lado = zona.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zona.includes("Rodilla")) {
      dolor = "Rodilla";
      lado = zona.includes("izquierda") ? "Izquierda" : "Derecha";
    }

    setDatosPaciente((prev) => {
      const next = { ...prev, dolor, lado };
      try {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // ====== Submit del formulario principal ======
  const handleSubmit = (e) => {
    e.preventDefault();
    const edadNum = Number(datosPaciente.edad);
    if (
      !datosPaciente.nombre?.trim() ||
      !datosPaciente.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0 ||
      !datosPaciente.dolor?.trim()
    ) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (modulo === "preop" || modulo === "generales") {
      // Abrir comorbilidades SOLO si aún no se han completado para ese módulo
      const scope = modulo;
      if (!comorbOkRef.current[scope]) {
        setMostrarComorbilidades(true);
      } else {
        if (scope === "preop") llamarPreopIA();
        else llamarGeneralesIA();
      }
      return;
    }

    // Otros módulos (trauma/ia): flujo tradicional
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
    setPendingPreview(false);
  };

  // ====== Detección de RM en backend ======
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

  const handleDescargarPDF = async () => {
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
          if (i === maxIntentos) {
            alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
          }
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

      let extras = {};
      const solicitarRM = await detectarResonanciaEnBackend({
        ...datosPaciente,
        edad: edadNum,
      });

      if (solicitarRM) {
        const res = await pedirChecklistResonancia();
        if (res?.canceled) return;

        if (res.bloquea) {
          alert("Por seguridad, cambiaremos la resonancia por otro examen.");
          extras.ordenAlternativa =
            "Sugerencia: TAC según protocolo (RM bloqueada por checklist de seguridad).";
        } else {
          extras.resonanciaChecklist = res.data || {};
          extras.resonanciaResumenTexto =
            res.resumen || resumenResoTexto(res.data || {});
        }
      }

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago: idPagoTmp,
          datosPaciente: { ...datosPaciente, edad: edadNum },
          ...extras,
        }),
      });

      await irAPagoKhipu(
        { ...datosPaciente, edad: edadNum },
        { idPago: idPagoTmp, modulo: "trauma" }
      );
    } catch (err) {
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  // ====== UI ======
  return (
    <div style={styles.page}>
      {/* Barra superior fija */}
      <div style={styles.topBarWrap}>
        <div style={styles.topBar}>
          {[
            { key: "trauma", label: "ASISTENTE TRAUMATOLÓGICO" },
            { key: "preop", label: "EXÁMENES PREQUIRÚRGICOS" },
            { key: "generales", label: "REVISIÓN GENERAL" },
            { key: "ia", label: "ANÁLISIS MEDIANTE IA" },
          ].map((b) => {
            const active = modulo === b.key;
            const styleBtn = {
              ...styles.topBtn,
              ...(active ? styles.topBtnActive : styles.topBtnIdle),
            };
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => {
                  setModulo(b.key);
                  sessionStorage.setItem("modulo", b.key);
                  setPendingPreview(false);
                  // Aviso Legal al entrar por primera vez a PREOP o GENERALES
                  if (
                    (b.key === "preop" || b.key === "generales") &&
                    !avisoOkRef.current[b.key]
                  ) {
                    setMostrarAviso(true);
                  }
                }}
                style={styleBtn}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal Aviso Legal */}
      <AvisoLegal
        visible={mostrarAviso}
        persist={false}
        onAccept={continuarTrasAviso}
        onReject={rechazarAviso}
      />

      <div style={styles.content}>
        {/* Columna 1 - Esquema */}
        <div style={styles.esquemaCol}>
          <EsquemaToggleTabs vista={vista} onChange={setVista} />
          {vista === "anterior" ? (
            <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
          ) : (
            <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />
          )}

          <div aria-live="polite" role="status" style={styles.statusBox}>
            {datosPaciente?.dolor ? (
              <>
                Zona seleccionada:{" "}
                <strong>
                  {datosPaciente.dolor}
                  {datosPaciente.lado ? ` — ${datosPaciente.lado}` : ""}
                </strong>
              </>
            ) : (
              "Seleccione una zona en el esquema"
            )}
          </div>
        </div>

        {/* Columna 2 - Formulario Paciente */}
        <div style={styles.formCol}>
          <FormularioPaciente
            datos={datosPaciente}
            onCambiarDato={handleCambiarDato}
            onSubmit={handleSubmit}
            /* sigue pasando el módulo si lo necesitas internamente */
            moduloActual={modulo}
          />
        </div>

        {/* Columna 3 - Previews / Acciones */}
        <div style={styles.previewCol} data-preview-col>
          {mostrarVistaPrevia && modulo === "trauma" && (
            <>
              <PreviewOrden datos={datosPaciente} />
              {!pagoRealizado && !mostrarPago && (
                <>
                  <button
                    type="button"
                    style={styles.actionBtn}
                    onClick={handlePagarAhora}
                  >
                    Pagar ahora
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.actionBtn, backgroundColor: T.muted }}
                    onClick={async () => {
                      const idPago = "guest_test_pago";
                      const datosGuest = {
                        nombre: "Guest",
                        rut: "99999999-9",
                        edad: 30,
                        genero: "Hombre",
                        dolor: "Rodilla",
                        lado: "Izquierda",
                      };
                      sessionStorage.setItem("idPago", idPago);
                      sessionStorage.setItem(
                        "datosPacienteJSON",
                        JSON.stringify(datosGuest)
                      );

                      const resp = await fetch(
                        `${BACKEND_BASE}/crear-pago-khipu`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            idPago,
                            modoGuest: true,
                            datosPaciente: datosGuest,
                          }),
                        }
                      );
                      const j = await resp.json();
                      if (j?.ok && j?.url) {
                        window.location.href = j.url;
                      } else {
                        alert("Guest no disponible. Ver backend.");
                      }
                    }}
                  >
                    Simular Pago como Guest
                  </button>
                </>
              )}

              {mostrarVistaPrevia && pagoRealizado && (
                <button
                  type="button"
                  style={styles.actionBtn}
                  onClick={handleDescargarPDF}
                  disabled={descargando}
                  title={mensajeDescarga || "Verificar y descargar"}
                >
                  {descargando ? mensajeDescarga || "Verificando…" : "Descargar Documento"}
                </button>
              )}
            </>
          )}

          {mostrarVistaPrevia && modulo === "preop" && (
            <PreopModulo initialDatos={datosPaciente} />
          )}

          {mostrarVistaPrevia && modulo === "generales" && (
            <GeneralesModulo initialDatos={datosPaciente} />
          )}

          {mostrarVistaPrevia && modulo === "ia" && (
            <IAModulo key={`ia-${modulo}`} initialDatos={datosPaciente} />
          )}
        </div>
      </div>

      {/* ===== Modal RNM ===== */}
      {showReso && (
        <div style={styles.modalOverlay}>
          <div style={{ width: "min(900px, 96vw)" }}>
            <FormularioResonancia
              onCancel={() => {
                setShowReso(false);
                resolverReso?.({ canceled: true });
              }}
              onSave={(data, { riesgos }) => {
                setShowReso(false);
                const resumen = resumenResoTexto(data);
                const bloquea = hasRedFlags(data);
                resolverReso?.({ canceled: false, bloquea, data, riesgos, resumen });
              }}
            />
          </div>
        </div>
      )}

      {/* ===== Modal Comorbilidades ===== */}
      {mostrarComorbilidades && (
        <div style={styles.modalOverlay}>
          <div style={{ width: "min(900px, 96vw)" }}>
            <FormularioComorbilidades
              initial={comorbilidades || {}}
              onSave={handleSaveComorbilidades}
              onCancel={() => setMostrarComorbilidades(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== Styles (solo variables del theme.json) ================== */
const styles = {
  page: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: T.bg,
    minHeight: "100vh",
  },

  /* Top bar */
  topBarWrap: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: T.headerBg || T.bg,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: T.headerBorder ?? T.border,
    boxShadow: T.headerShadow ?? T.shadowSm,
  },
  topBar: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 16px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
  },
  topBtn: {
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all .18s ease",
    lineHeight: 1.2,
    borderWidth: 2,
    borderStyle: "solid",
  },
  topBtnActive: {
    backgroundColor: T.primary,
    color: T.onPrimary,
    borderColor: T.primaryDark,
    boxShadow: `0 0 0 3px ${T.accentAlpha}, ${T.shadowMd}`,
    transform: "translateY(-1px)",
  },
  topBtnIdle: {
    backgroundColor: T.surface,
    color: T.primary,
    borderColor: T.primary,
  },

  /* Layout */
  content: {
    display: "grid",
    gridTemplateColumns: "400px 400px 1fr",
    gap: 40,
    maxWidth: 1200,
    margin: "18px auto",
    padding: "0 16px 24px",
  },
  esquemaCol: { flex: "0 0 400px", maxWidth: 400 },

  /* Stacking para que los modales siempre queden arriba */
  formCol: {
    flex: "0 0 400px",
    maxWidth: 400,
    position: "relative",
    zIndex: 0,
  },
  previewCol: {
    minWidth: 360,
    position: "relative",
    zIndex: 0,
    overflow: "hidden",
  },

  statusBox: {
    marginTop: 8,
    fontSize: 14,
    color: T.textMuted,
    background: T.surface,
    padding: "6px 8px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: T.border,
    minHeight: 30,
  },

  actionBtn: {
    marginTop: 12,
    backgroundColor: T.primary,
    color: T.onPrimary,
    border: "none",
    padding: "12px",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
    width: "100%",
    boxShadow: T.shadowSm,
  },

  /* Modals */
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: T.overlay,
    display: "grid",
    placeItems: "center",
    zIndex: 2147483000,
    padding: 12,
    pointerEvents: "auto",
  },
};

export default App;
