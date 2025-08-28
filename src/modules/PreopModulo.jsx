// src/modules/PreopModulo.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

const BACKEND_BASE = 'https://asistencia-ica-backend.onrender.com';

export default function PreopModulo({ initialDatos }) {
  const [datos, setDatos] = useState(() => ({
    nombre: initialDatos?.nombre || "",
    rut: initialDatos?.rut || "",
    edad: initialDatos?.edad || "",
    lado: initialDatos?.lado || "",
    // Campos preop
    tipoCirugia: "Prótesis de Rodilla",
    fechaCirugia: "",
    comorbilidades: "",
  }));

  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [msg, setMsg] = useState("");
  const warmRef = useRef(null);

  // Al montar: restaurar y manejar retorno ?pago=ok&idPago=...
  useEffect(() => {
    // Rellena con session si existe
    const saved = sessionStorage.getItem("preopDatosJSON");
    if (saved) {
      try {
        const j = JSON.parse(saved);
        setDatos((p) => ({ ...p, ...j }));
      } catch {}
    }
    // Retorno Khipu
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    const idPago = params.get("idPago") || sessionStorage.getItem("preopIdPago");
    if (pago === "ok" && idPago) {
      sessionStorage.setItem("preopIdPago", idPago);
      setPagoRealizado(true);
      // “calentar” backend
      let i = 0;
      warmRef.current = setInterval(async () => {
        i++;
        try {
          await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`, { cache: "no-store" });
        } catch {}
        if (i >= 10) {
          clearInterval(warmRef.current);
          warmRef.current = null;
        }
      }, 2000);
      // limpiar query
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
    return () => {
      if (warmRef.current) clearInterval(warmRef.current);
    };
  }, []);

  const guardarPreop = async (idPago, body) => {
    await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, datosPaciente: body }),
    });
  };

  const pagar = async ({ guest = false } = {}) => {
    if (pagando) return;
    if (!datos.nombre || !datos.rut || !datos.edad) {
      alert("Complete nombre, RUT y edad.");
      return;
    }
    setPagando(true);
    try {
      const idPago =
        sessionStorage.getItem("preopIdPago") ||
        `preop_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      sessionStorage.setItem("preopIdPago", idPago);
      sessionStorage.setItem("preopDatosJSON", JSON.stringify(datos));

      // Persistir en backend
      await guardarPreop(idPago, datos);

      // Redirigir a pago (usa tu backend Khipu real; aquí asumimos que PagoKhipu crea el link)
      // Si prefieres usar tu endpoint /crear-pago-khipu, también sirve.
      await irAPagoKhipu({ ...datos, idPago, modoGuest: guest });
    } catch (e) {
      console.error(e);
      alert("No se pudo iniciar el pago.");
    } finally {
      setPagando(false);
    }
  };

  const descargar = async (tipo) => {
    const idPago = sessionStorage.getItem("preopIdPago");
    if (!idPago) return alert("ID de pago no encontrado.");
    setDescargando(true);
    setMsg("Verificando pago…");
    try {
      for (let i = 1; i <= 12; i++) {
        const res = await fetch(
          `${BACKEND_BASE}/pdf-preop/${idPago}?tipo=${tipo}&ts=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.status === 402) {
          setMsg(`Verificando pago… (${i}/12)`);
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        if (res.status === 404) {
          // reinyecta si el backend reinició
          const respaldo = sessionStorage.getItem("preopDatosJSON");
          if (respaldo) await guardarPreop(idPago, JSON.parse(respaldo));
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const nombre = (datos.nombre || "paciente").replace(/[^a-zA-Z0-9_-]+/g, "_");
        a.href = url;
        a.download = tipo === "imagen" ? `preop_imagen_${nombre}.pdf` : `preop_lab_${nombre}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        break;
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMsg("");
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Resumen del paciente (Preoperatorio)</h3>
        <p><b>{datos.nombre}</b> — RUT: {datos.rut} — Edad: {datos.edad}</p>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Tipo de cirugía
            <select
              style={input}
              value={datos.tipoCirugia}
              onChange={(e) => setDatos((p) => ({ ...p, tipoCirugia: e.target.value }))}
            >
              <option>Prótesis de Rodilla</option>
              <option>Prótesis de Cadera</option>
              <option>Artroscopia de Rodilla</option>
              <option>Artroscopia de Cadera</option>
            </select>
          </label>
          <label>
            Lado (opcional)
            <input
              style={input}
              placeholder="Izquierda / Derecha"
              value={datos.lado}
              onChange={(e) => setDatos((p) => ({ ...p, lado: e.target.value }))}
            />
          </label>
          <label>
            Fecha estimada de cirugía (opcional)
            <input
              style={input}
              type="date"
              value={datos.fechaCirugia}
              onChange={(e) => setDatos((p) => ({ ...p, fechaCirugia: e.target.value }))}
            />
          </label>
          <label>
            Comorbilidades
            <textarea
              style={{ ...input, minHeight: 80 }}
              placeholder="HTA, DM2, EPOC, anticoagulantes…"
              value={datos.comorbilidades}
              onChange={(e) => setDatos((p) => ({ ...p, comorbilidades: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <div style={box}>
        <h4>Preview – Laboratorio y ECG</h4>
        <p>
          Hemograma, PCR/VSG, Glicemia, Creatinina, Electrolitos, Hepático, Grupo/Rh, ECG.
          + Ajustes por comorbilidades (coagulograma, HbA1c, orina, perfil lipídico…)
        </p>
      </div>

      <div style={box}>
        <h4>Preview – Imagenología Preoperatoria</h4>
        <p>
          Rx Tórax (si corresponde). Proyecciones estándar/preoperatorias de Rodilla/Cadera según cirugía y lado.
        </p>
      </div>

      {!pagoRealizado ? (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <button
            style={btnPrimary}
            onClick={() => pagar({ guest: false })}
            disabled={pagando}
          >
            {pagando ? "Preparando pago…" : "Pagar ahora"}
          </button>
          <button style={btn} onClick={() => pagar({ guest: true })}>
            Simular pago (Guest)
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <button
            style={btn}
            onClick={() => descargar("lab")}
            disabled={descargando}
            title={msg || "Descargar"}
          >
            {descargando ? msg || "Descargando…" : "Descargar PDF – Lab/ECG"}
          </button>
          <button
            style={btn}
            onClick={() => descargar("imagen")}
            disabled={descargando}
            title={msg || "Descargar"}
          >
            {descargando ? msg || "Descargando…" : "Descargar PDF – Imagenología"}
          </button>
        </div>
      )}
    </div>
  );
}

const box = { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 12, marginTop: 10 };
const input = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginTop: 6 };
const btn = { width: "100%", padding: 12, border: "none", borderRadius: 8, background: "#0072CE", color: "#fff", cursor: "pointer" };
const btnPrimary = { ...btn, background: "#004B94" };
