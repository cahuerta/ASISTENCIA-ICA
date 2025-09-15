"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* ============================== UI ============================== */
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
  block: { marginTop: 12 },
  mono: {
    whiteSpace: "pre-wrap",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    background: "#f7f7f7",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    lineHeight: 1.45,
    border: "1px solid #eee",
  },
  hint: { marginTop: 6, fontStyle: "italic", color: "#666" },
  tag: {
    display: "inline-block",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 12,
    background: "#eef6ff",
    border: "1px solid #cfe4ff",
    color: "#0b63c5",
    marginRight: 6,
    marginBottom: 6,
  },
};

/* Etiquetas amigables para el preview de comorbilidades */
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

function ensureGeneralesIdPago() {
  let id = sessionStorage.getItem("idPago");
  if (!id || !id.startsWith("generales_")) {
    id = `generales_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    sessionStorage.setItem("idPago", id);
  }
  return id;
}

function prettyComorb(c = {}) {
  try {
    const keys = Object.keys(c);
    if (!keys.length) return [];
    const bullets = [];
    for (const k of keys) {
      const v = c[k];
      const label = LABELS_COMORB[k] || k.replace(/_/g, " ");

      // booleanos: mostrar solo los true
      if (typeof v === "boolean") {
        if (v) bullets.push(label);
        continue;
      }
      // objetos {tiene/detalle} o {usa/detalle}
      if (typeof v === "object" && v !== null && (v.tiene || v.usa || v.detalle)) {
        let t = label;
        if (v.detalle) t += ` — ${v.detalle}`;
        bullets.push(t);
        continue;
      }
      // strings con contenido
      if (typeof v === "string" && v.trim()) {
        bullets.push(`${label}: ${v.trim()}`);
      }
    }
    return bullets;
  } catch {
    return [];
  }
}

/* ============================== Componente ============================== */
export default function GeneralesModulo({ initialDatos }) {
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // Carga de IA y comorbilidades (guardadas por App.jsx)
  const [examenesIA, setExamenesIA] = useState([]);
  const [informeIA, setInformeIA] = useState("");
  const [comorbilidades, setComorbilidades] = useState({});

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("datosPacienteJSON");
      if (saved) setDatos((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}

    try {
      const ex = JSON.parse(sessionStorage.getItem("generales_ia_examenes") || "[]");
      const inf = sessionStorage.getItem("generales_ia_resumen") || "";
      setExamenesIA(Array.isArray(ex) ? ex : []);
      setInformeIA(inf);
    } catch {}

    try {
      const c = JSON.parse(sessionStorage.getItem("generales_comorbilidades_data") || "{}");
      setComorbilidades(c || {});
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
          await fetch(`${BACKEND_BASE}/obtener-datos-generales/${idPago}`);
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

  /* ------------------------------ Pago ------------------------------ */
  const handlePagarGenerales = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) ||
      edadNum <= 0
    ) {
      alert("Complete nombre, RUT y edad (>0) antes de pagar.");
      return;
    }
    if (!datos.genero) {
      // No cambiamos tus valores; se siguen usando MASCULINO / FEMENINO
      alert("Seleccione el género (MASCULINO/FEMENINO) en el formulario.");
      return;
    }

    try {
      const idPago = ensureGeneralesIdPago();
      sessionStorage.setItem("modulo", "generales");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPago,
          datosPaciente: { ...datos, edad: edadNum },
          comorbilidades,
          examenesIA,
          informeIA,
        }),
      });

      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago, modulo: "generales" });
    } catch (err) {
      console.error("No se pudo generar el link de pago (generales):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  /* --------------------------- Descargar PDF --------------------------- */
  const handleDescargarGenerales = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf-generales/${idPago}`, { cache: "no-store" });
      if (res.status === 404) return { ok: false, status: 404 };
      if (res.status === 402) return { ok: false, status: 402 };
      if (!res.ok) throw new Error("Error al obtener el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = (datos?.nombre || "paciente").replace(/ /g, "_");
      a.download = `generales_${baseName}.pdf`;
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

            await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idPago,
                datosPaciente: datosReinyectar,
                comorbilidades,
                examenesIA,
                informeIA,
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

  /* ------------------------------ Preview (SOLO IA) ------------------------------ */
  const usarIA = Array.isArray(examenesIA) && examenesIA.length > 0;
  const comorbBullets = prettyComorb(comorbilidades);

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Vista previa — Exámenes Generales</h3>

      <div style={{ marginBottom: 10 }}>
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div><strong>Género:</strong> {datos?.genero || "—"}</div>
      </div>

      {/* Comorbilidades (si existen) */}
      {comorbBullets.length > 0 && (
        <div style={styles.block}>
          <strong>Comorbilidades:</strong>
          <div style={{ marginTop: 6 }}>
            {comorbBullets.map((t, i) => (
              <span key={i} style={styles.tag}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Exámenes (SOLO IA) */}
      <div style={styles.block}>
        <strong>Exámenes solicitados (IA):</strong>
        {usarIA ? (
          <ul style={{ marginTop: 6 }}>
            {examenesIA.map((e, idx) => (
              <li key={`${e}-${idx}`}>{e}</li>
            ))}
          </ul>
        ) : (
          <div style={styles.hint}>
            Aún no hay lista generada por IA. Desde el formulario principal, pulsa
            <strong> “Generar Informe”</strong> para ejecutar la IA y ver el resultado aquí.
          </div>
        )}
      </div>

      {/* Informe IA (si existe) */}
      {informeIA && (
        <div style={styles.block}>
          <strong>Informe IA (resumen):</strong>
          <div style={{ marginTop: 6, ...styles.mono }}>{informeIA}</div>
        </div>
      )}

      {!pagoRealizado ? (
        <>
          <button
            style={{ ...styles.btn, backgroundColor: "#004B94", marginTop: 12 }}
            onClick={handlePagarGenerales}
          >
            Pagar ahora (Generales)
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: "#777", marginTop: 8 }}
            onClick={async () => {
              const idPago = `generales_guest_${Date.now()}`;
              const datosGuest = {
                nombre: "Guest",
                rut: "99999999-9",
                edad: 60,
                genero: "MASCULINO", // sin cambiar tus valores
              };

              sessionStorage.setItem("idPago", idPago);
              sessionStorage.setItem("modulo", "generales");
              sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datosGuest));

              await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  idPago,
                  datosPaciente: datosGuest,
                  comorbilidades,
                  examenesIA,
                  informeIA,
                }),
              });

              const url = new URL(window.location.href);
              url.searchParams.set("pago", "ok");
              url.searchParams.set("idPago", idPago);
              window.location.href = url.toString();
            }}
            title="Simular retorno pagado (solo pruebas)"
          >
            Simular Pago (Guest)
          </button>
        </>
      ) : (
        <button
          style={{ ...styles.btn, marginTop: 12 }}
          onClick={handleDescargarGenerales}
          disabled={descargando}
          title={mensajeDescarga || "Verificar y descargar"}
        >
          {descargando ? mensajeDescarga || "Verificando…" : "Descargar Documento"}
        </button>
      )}
    </div>
  );
}
