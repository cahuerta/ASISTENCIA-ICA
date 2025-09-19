"use client";
import React, { useState, useEffect, useRef } from "react";

/* Esquema corporal */
import EsquemaAnterior from "./EsquemaAnterior.jsx";
import EsquemaPosterior from "./EsquemaPosterior.jsx";
import EsquemaToggleTabs from "./EsquemaToggleTabs.jsx";

/* Formularios y módulos */
import FormularioPaciente from "./FormularioPaciente.jsx";
import PreopModulo from "./modules/PreopModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import IAModulo from "./modules/IAModulo.jsx";
import TraumaModulo from "./modules/TraumaModulo.jsx";

/* Utilidades existentes */
import AvisoLegal from "./components/AvisoLegal.jsx";
import FormularioResonancia from "./components/FormularioResonancia.jsx";
import FormularioComorbilidades from "./components/FormularioComorbilidades.jsx";

/* Tema (JSON + helper) */
import { getTheme } from "./theme.js";
const T = getTheme();

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* === Normaliza solo para el backend (UI sigue: MASCULINO / FEMENINO) === */
const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

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
  const [pagoRealizado, setPagoRealizado] = useState(false); // usado por módulos que lean el query param
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

  // ====== RNM (checklist) centralizado en App para compartirlo ======
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

  // Expuesto para módulos que lo necesiten
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
    const paciente = {
      ...datosPaciente,
      edad: edadNum,
      genero: normalizarGenero(datosPaciente.genero),
    };

    const postIA = async (path) =>
      fetch(`${BACKEND_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          paciente,
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
        setPendingPreview(false);
      } else {
        setPendingPreview(true);
        setMostrarAviso(true);
      }
    } catch {
      alert("No fue posible obtener la información de IA desde el backend. Intenta nuevamente.");
      setPendingPreview(false);
    }
  };

  // ---- IA GENERALES ----
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
    const paciente = {
      ...datosPaciente,
      edad: edadNum,
      genero: normalizarGenero(datosPaciente.genero),
    };

    const body = {
      idPago,
      paciente,
      comorbilidades: comorb || {},
    };

    try {
      // 1) Nueva ruta específica
      let resp = await fetch(`${BACKEND_BASE}/ia-generales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // 2) Fallback a endpoints existentes
      if (!resp.ok) {
        resp = await fetch(`${BACKEND_BASE}/preop-ia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });
      }
      if (!resp.ok) {
        resp = await fetch(`${BACKEND_BASE}/ia-preop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tipoCirugia: "" }),
        });
      }
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
        setPendingPreview(false);
      } else {
        setPendingPreview(true);
        setMostrarAviso(true);
      }
    } catch {
      alert("No fue posible obtener la información de IA (Generales). Intenta nuevamente.");
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
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);

      // (El polling fino lo hace cada módulo; mantenemos legacy para compatibilidad)
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try {
          // Trauma
          await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`);
          // Preop / Generales manejan su propia restauración
        } catch {}
        if (intentos >= 30) {
          clearInterval(pollerRef.current);
          pollerRef.current = null;
        }
      }, 2000);
    } else if (!pago && idFinal) {
      // Si venimos de historial con idPago en sessionStorage
      setMostrarVistaPrevia(true);
      setPagoRealizado(true);
    } else if (pago === "ok" && !idFinal) {
      alert("No recibimos idPago en el retorno. Intenta nuevamente.");
    } else if (pago === "cancelado") {
      alert("Pago cancelado.");
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    const edadNum = Number(datosPaciente.edad);

    // Reglas generales
    if (
      !datosPaciente.nombre?.trim() ||
      !datosPaciente.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0
    ) {
      alert("Por favor complete nombre, RUT y edad (>0).");
      return;
    }

    // Solo TRAUMA exige dolor/lado
    if (modulo === "trauma" && !datosPaciente.dolor?.trim()) {
      alert("Seleccione dolor/zona en el esquema para continuar.");
      return;
    }

    if (modulo === "preop" || modulo === "generales") {
      const scope = modulo;
      if (!comorbOkRef.current[scope]) {
        setMostrarComorbilidades(true);
      } else {
        if (scope === "preop") await llamarPreopIA();
        else await llamarGeneralesIA();
      }
      return;
    }

    // Otros módulos (trauma/ia): mostrar el módulo correspondiente
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setPendingPreview(false);
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
            moduloActual={modulo}
          />
        </div>

        {/* Columna 3 - Previews / Acciones */}
        <div style={styles.previewCol} data-preview-col>
          {mostrarVistaPrevia && modulo === "trauma" && (
            <TraumaModulo
              initialDatos={datosPaciente}
              // props opcionales para usar el checklist desde el módulo
              onPedirChecklistResonancia={pedirChecklistResonancia}
              onDetectarResonancia={detectarResonanciaEnBackend}
              resumenResoTexto={resumenResoTexto}
            />
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
