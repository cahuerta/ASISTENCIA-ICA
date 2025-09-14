"use client";
import React, { useState, useEffect, useRef } from "react";

/* Esquema */
import EsquemaAnterior from "./EsquemaAnterior.jsx";
import EsquemaPosterior from "./EsquemaPosterior.jsx";
import EsquemaToggleTabs from "./EsquemaToggleTabs.jsx";

/* UI base */
import FormularioPaciente from "./FormularioPaciente.jsx";
import PreviewOrden from "./PreviewOrden.jsx";

/* Módulos */
import PreopModulo from "./modules/PreopModulo.jsx";
import GeneralesModulo from "./modules/GeneralesModulo.jsx";
import IAModulo from "./modules/IAModulo.jsx";

/* Utilidades */
import { irAPagoKhipu } from "./PagoKhipu.jsx";
import AvisoLegal from "./components/AvisoLegal.jsx";
import FormularioResonancia from "./components/FormularioResonancia.jsx";
import FormularioComorbilidades from "./components/FormularioComorbilidades.jsx";

/* THEME */
import { getTheme } from "./theme.js";
const T = getTheme();

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

function App() {
  const [datosPaciente, setDatosPaciente] = useState({
    nombre: "",
    rut: "",
    edad: "",
    genero: "",
    dolor: "",
    lado: "",
  });

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Módulo activo (trauma | preop | generales | ia)
  const [modulo, setModulo] = useState(() => {
    const m = sessionStorage.getItem("modulo");
    return m || "trauma";
  });

  // Vista esquema
  const [vista, setVista] = useState(() => sessionStorage.getItem("vistaEsquema") || "anterior");

  // ========= Modal RNM =========
  const [showReso, setShowReso] = useState(false);
  const [resolverReso, setResolverReso] = useState(null);
  const RED_FLAGS = new Set(["marcapasos","coclear_o_neuro","clips_aneurisma","valvula_cardiaca_metal","fragmentos_metalicos"]);
  const pedirChecklistResonancia = () =>
    new Promise((resolve) => { setResolverReso(() => resolve); setShowReso(true); });
  const hasRedFlags = (data) =>
    Object.entries(data || {}).some(([k, v]) => RED_FLAGS.has(k) && v === true);
  const resumenResoTexto = (data) => {
    const si = Object.entries(data || {}).filter(([_, v]) => v === true).map(([k]) => k).join(", ") || "—";
    const no = Object.entries(data || {}).filter(([_, v]) => v === false).map(([k]) => k).join(", ") || "—";
    return [
      "FORMULARIO DE SEGURIDAD PARA RESONANCIA MAGNÉTICA",
      `Sí: ${si}`,
      `No: ${no}`,
      "Declaro que la información es veraz y autorizo la realización del examen.",
      "Firma Paciente: ______________________     RUT: _______________     Fecha: ____/____/______",
    ].join("\n");
  };

  // ========= Modal Comorbilidades =========
  const [mostrarComorbilidades, setMostrarComorbilidades] = useState(false);
  const [comorbilidades, setComorbilidades] = useState(null);
  const handleSaveComorbilidades = (payload) => {
    setComorbilidades(payload);
    setMostrarVistaPrevia(true);
    setModulo("preop");
    sessionStorage.setItem("modulo", "preop");
    setMostrarComorbilidades(false);
  };

  // ========= Montaje =========
  useEffect(() => {
    const saved = sessionStorage.getItem("datosPacienteJSON");
    if (saved) {
      try { setDatosPaciente(JSON.parse(saved)); } catch {}
    }

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
        try { await fetch(`${BACKEND_BASE}/obtener-datos/${idFinal}`); } catch {}
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

  // Persistir vista y módulo
  useEffect(() => {
    try { sessionStorage.setItem("vistaEsquema", vista); } catch {}
  }, [vista]);
  useEffect(() => {
    try { sessionStorage.setItem("modulo", modulo); } catch {}
  }, [modulo]);

  const handleCambiarDato = (campo, valor) => {
    setDatosPaciente((prev) => {
      const next = { ...prev, [campo]: valor };
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Selección de zona del esquema
  const onSeleccionZona = (zona) => {
    let dolor = "", lado = "";
    if (zona.includes("Columna")) {
      dolor = "Columna lumbar";
    } else if (zona.includes("Cadera")) {
      dolor = "Cadera";
      lado = zona.includes("izquierda") ? "Izquierda" : "Derecha";
    } else if (zona.includes("Rodilla")) {
      dolor = "Rodilla";
      lado = zona.includes("izquierda") ? "Izquierda" : "Derecha";
    }

    setDatosPaciente((prev) => {
      const next = { ...prev, dolor, lado };
      try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Aviso legal
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const continuarTrasAviso = () => {
    setMostrarAviso(false);
    setMostrarVistaPrevia(true);
    setPagoRealizado(false);
    setMostrarPago(false);
    // si no hay módulo previo, por defecto trauma
    if (!sessionStorage.getItem("modulo")) {
      setModulo("trauma");
      sessionStorage.setItem("modulo", "trauma");
    }
  };
  const rechazarAviso = () => {
    setMostrarAviso(false);
    try { window.close(); } catch {}
    setTimeout(() => {
      if (!window.closed) window.location.href = "about:blank";
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const edadNum = Number(datosPaciente.edad);
    if (
      !datosPaciente.nombre?.trim() ||
      !datosPaciente.rut?.trim() ||
      !Number.isFinite(edadNum) || edadNum <= 0 ||
      !datosPaciente.dolor?.trim()
    ) {
      alert("Por favor complete todos los campos obligatorios.");
      return;
    }
    setMostrarAviso(true);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Detección RM (backend)
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
      const flag = typeof j?.resonancia === "boolean"
        ? j.resonancia
        : esResonanciaTexto(j?.texto || j?.orden || "");
      sessionStorage.setItem("solicitaResonancia", flag ? "1" : "0");
      return !!flag;
    } catch {
      sessionStorage.setItem("solicitaResonancia", "0");
      return false;
    }
  };

  // Pago/descarga (trauma)
  const handleDescargarPDF = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) return alert("ID de pago no encontrado");

    const intenta = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orden_${(datosPaciente.nombre || "paciente").replace(/ /g, "_")}.pdf`;
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
      const N = 30;
      for (let i = 1; i <= N; i++) {
        const r = await intenta();
        if (r.ok) break;

        if (r.status === 402) {
          setMensajeDescarga(`Verificando pago… (${i}/${N})`);
          await sleep(1500);
          if (i === N) alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
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
    } catch (e) {
      console.error(e);
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
      !Number.isFinite(edadNum) || edadNum <= 0 ||
      !datosPaciente.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return;
    }

    try {
      const idPagoTmp = sessionStorage.getItem("idPago") ||
        ("pago_" + Date.now() + "_" + Math.floor(Math.random() * 10000));

      sessionStorage.setItem("idPago", idPagoTmp);
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datosPaciente, edad: edadNum }));

      let extras = {};
      const solicitarRM = await detectarResonanciaEnBackend({ ...datosPaciente, edad: edadNum });

      if (solicitarRM) {
        const res = await pedirChecklistResonancia();
        if (res?.canceled) return;

        if (res.bloquea) {
          alert("Por seguridad, cambiaremos la resonancia por otro examen.");
          extras.ordenAlternativa = "Sugerencia: TAC según protocolo (RM bloqueada por checklist de seguridad).";
        } else {
          extras.resonanciaChecklist = res.data || {};
          extras.resonanciaResumenTexto = res.resumen || resumenResoTexto(res.data || {});
        }
      }

      await fetch(`${BACKEND_BASE}/guardar-datos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago: idPagoTmp, datosPaciente: { ...datosPaciente, edad: edadNum }, ...extras }),
      });

      await irAPagoKhipu({ ...datosPaciente, edad: edadNum }, { idPago: idPagoTmp, modulo: "trauma" });
    } catch (err) {
      console.error("No se pudo generar el link de pago:", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  // ======= Render =======
  return (
    <div style={{ ...styles.container, backgroundColor: T.bg }}>
      {/* Barra superior fija (siempre visible) */}
      <header style={{ ...styles.topbar, background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div style={styles.topbarInner}>
          <nav style={styles.navGrid}>
            {[
              ["trauma", "ASISTENTE TRAUMATOLÓGICO"],
              ["preop", "EXÁMENES PREQUIRÚRGICOS"],
              ["generales", "REVISIÓN GENERAL"],
              ["ia", "ANÁLISIS MEDIANTE IA"],
            ].map(([key, label]) => {
              const active = modulo === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setModulo(key)}
                  style={{
                    ...styles.navButton,
                    backgroundColor: active ? (T.primaryHover || T.primary) : T.primary,
                    boxShadow: active ? `0 0 0 3px ${T.accent}55` : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Aviso Legal */}
      <AvisoLegal
        visible={mostrarAviso}
        persist={false}
        onAccept={continuarTrasAviso}
        onReject={rechazarAviso}
      />

      {/* Layout principal */}
      <div style={styles.content}>
        {/* Columna esquema */}
        <div style={styles.esquemaContainer}>
          <EsquemaToggleTabs vista={vista} onChange={setVista} />
          {vista === "anterior" ? (
            <EsquemaAnterior onSeleccionZona={onSeleccionZona} width={400} />
          ) : (
            <EsquemaPosterior onSeleccionZona={onSeleccionZona} width={400} />
          )}
          <div
            aria-live="polite"
            role="status"
            style={{
              marginTop: 8,
              fontSize: 14,
              color: T.textPrimary,
              background: "#F3F4F6",
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              minHeight: 30,
            }}
          >
            {datosPaciente?.dolor
              ? <>Zona seleccionada: <strong>{datosPaciente.dolor}{datosPaciente.lado ? ` — ${datosPaciente.lado}` : ""}</strong></>
              : "Seleccione una zona en el esquema"}
          </div>
        </div>

        {/* Columna formulario */}
        <div style={styles.formularioContainer}>
          <FormularioPaciente
            datos={datosPaciente}
            onCambiarDato={handleCambiarDato}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Columna derecha (previews/acciones) */}
        <div style={styles.previewContainer} data-preview-col>
          {mostrarVistaPrevia && modulo === "trauma" && (
            <>
              <PreviewOrden datos={datosPaciente} />
              {!pagoRealizado && !mostrarPago && (
                <>
                  <button
                    type="button"
                    style={{ ...styles.actionButton, backgroundColor: T.primaryHover || T.primary, marginTop: 10 }}
                    onClick={handlePagarAhora}
                  >
                    Pagar ahora
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.actionButton, backgroundColor: "#777", marginTop: 10 }}
                    onClick={async () => {
                      const idPago = "guest_test_pago";
                      const datosGuest = { nombre: "Guest", rut: "99999999-9", edad: 30, genero: "Hombre", dolor: "Rodilla", lado: "Izquierda" };
                      sessionStorage.setItem("idPago", idPago);
                      sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datosGuest));

                      const resp = await fetch(`${BACKEND_BASE}/crear-pago-khipu`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idPago, modoGuest: true, datosPaciente: datosGuest }),
                      });
                      const j = await resp.json();
                      if (j?.ok && j?.url) window.location.href = j.url;
                      else alert("Guest no disponible. Ver backend.");
                    }}
                  >
                    Simular Pago como Guest
                  </button>
                </>
              )}
              {mostrarVistaPrevia && pagoRealizado && (
                <button
                  type="button"
                  style={{ ...styles.actionButton, marginTop: 10, backgroundColor: T.primary }}
                  onClick={handleDescargarPDF}
                  disabled={descargando}
                  title={mensajeDescarga || "Verificar y descargar"}
                >
                  {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
                </button>
              )}
            </>
          )}

          {mostrarVistaPrevia && modulo === "preop" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setMostrarComorbilidades(true)}
                  style={{ ...styles.navButton, maxWidth: 260, backgroundColor: T.primary }}
                >
                  COMORBILIDADES
                </button>
              </div>
              <PreopModulo initialDatos={datosPaciente} />
            </>
          )}

          {mostrarVistaPrevia && modulo === "generales" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setMostrarComorbilidades(true)}
                  style={{ ...styles.navButton, maxWidth: 260, backgroundColor: T.primary }}
                >
                  COMORBILIDADES
                </button>
              </div>
              <GeneralesModulo initialDatos={datosPaciente} />
            </>
          )}

          {mostrarVistaPrevia && modulo === "ia" && (
            <IAModulo key={`ia-${modulo}`} initialDatos={datosPaciente} />
          )}
        </div>
      </div>

      {/* ===== Modales ===== */}
      {showReso && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalWidth}>
            <FormularioResonancia
              onCancel={() => { setShowReso(false); resolverReso?.({ canceled: true }); }}
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

      {mostrarComorbilidades && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalWidth}>
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

const styles = {
  container: {
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  topbarInner: {
    margin: "0 auto",
    padding: "10px 16px",
    maxWidth: 1280,
  },
  navGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  navButton: {
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
    whiteSpace: "normal",
    lineHeight: 1.2,
    minHeight: 44,
  },
  content: {
    display: "grid",
    gridTemplateColumns: "400px 400px 1fr",
    gap: 40,
    padding: 20,
    maxWidth: 1280,
    margin: "0 auto",
  },
  esquemaContainer: { maxWidth: 400 },
  formularioContainer: { maxWidth: 400, position: "relative", zIndex: 2 },
  previewContainer: { minWidth: 360, position: "relative", zIndex: 1 },

  actionButton: {
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontSize: 16,
    cursor: "pointer",
    width: "100%",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
  },
  modalWidth: { width: "min(900px, 96vw)" },
};

export default App;
