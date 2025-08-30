"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

// Base PRE-OP (exacta, en mayúsculas)
const PREOP_BASE = [
  "HEMOGRAMA",
  "VHS",
  "PCR",
  "ELECTROLITOS PLASMATICOS",
  "PERFIL BIOQUIMICO",
  "PERFIL LIPIDICO",
  "CREATININA",
  "TTPK",
  "HEMOGLOBINA GLICOSILADA",
  "VITAMINA D",
  "ORINA",
  "UROCULTIVO",
  "ECG DE REPOSO",
];

// Construye la lista de “Exámenes generales” según género
function buildExamenesGenerales({ genero }) {
  const g = (genero || "").toLowerCase();

  if (g === "hombre") {
    // Hombre: mismos PREOP, quitar UROCULTIVO, + PERFIL HEPÁTICO, ANTÍGENO PROSTÁTICO, CEA
    const base = PREOP_BASE.filter((x) => x !== "UROCULTIVO");
    return [
      ...base,
      "PERFIL HEPÁTICO",
      "ANTÍGENO PROSTÁTICO",
      "CEA",
    ];
  }

  if (g === "mujer") {
    // Mujer: mismos PREOP, + PERFIL HEPÁTICO, MAMOGRAFÍA, TSHm y T4 LIBRE, CALCIO, PAPANICOLAO (según edad)
    return [
      ...PREOP_BASE,
      "PERFIL HEPÁTICO",
      "MAMOGRAFÍA",
      "TSHm y T4 LIBRE",
      "CALCIO",
      "PAPANICOLAO (según edad)",
    ];
  }

  // Sin género aún → muestra solo base para referencia
  return PREOP_BASE;
}

export default function GeneralesModulo({ initialDatos }) {
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

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
        try { await fetch(`${BACKEND_BASE}/obtener-datos-generales/${idPago}`); } catch {}
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

  const handlePagarGenerales = async () => {
    const edadNum = Number(datos.edad);
    if (
      !datos.nombre?.trim() ||
      !datos.rut?.trim() ||
      !Number.isFinite(edadNum) || edadNum <= 0 ||
      !datos.dolor?.trim()
    ) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return;
    }
    if (!datos.genero) {
      alert("Seleccione el género (Hombre/Mujer) en el formulario.");
      return;
    }

    try {
      const idPago = sessionStorage.getItem("idPago") ||
        ("generales_" + Date.now() + "_" + Math.floor(Math.random() * 10000));

      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "generales");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      // Guarda en backend (endpoints espejo de preop; te paso el backend cuando quieras)
      await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, datosPaciente: { ...datos, edad: edadNum } }),
      });

      // ÚNICO CAMBIO: pasar idPago y modulo en el segundo parámetro (opts)
      await irAPagoKhipu(
        { ...datos, edad: edadNum },
        { idPago, modulo: 'generales' }
      );
    } catch (err) {
      console.error("No se pudo generar el link de pago (generales):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

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
    } catch (error) {
      console.error(error);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
      setMensajeDescarga("");
    }
  };

  const handleSimularPagoGuest = async () => {
    const idPago = "generales_guest_" + Date.now();
    const datosGuest = {
      nombre: "Guest",
      rut: "99999999-9",
      edad: 30,
      genero: "Hombre",
      dolor: "—",
      lado: "",
    };

    sessionStorage.setItem("idPago", idPago);
    sessionStorage.setItem("modulo", "generales");
    sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datosGuest));

    await fetch(`${BACKEND_BASE}/guardar-datos-generales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPago, datosPaciente: datosGuest }),
    });

    const url = new URL(window.location.href);
    url.searchParams.set("pago", "ok");
    url.searchParams.set("idPago", idPago);
    window.location.href = url.toString();
  };

  const items = buildExamenesGenerales({ genero: datos?.genero });

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Vista previa — Exámenes generales</h3>

      <div style={{ marginBottom: 10 }}>
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div><strong>Género:</strong> {datos?.genero || "—"}</div>
      </div>

      <div>
        <strong>Exámenes solicitados:</strong>
        <ul style={{ marginTop: 6 }}>
          {items.map((e) => <li key={e}>{e}</li>)}
        </ul>
        {!datos?.genero && (
          <div style={{ marginTop: 6, fontStyle: 'italic' }}>
            * Seleccione el género en el formulario para ver la lista final.
          </div>
        )}
      </div>

      {!pagoRealizado && (
        <>
          <button
            style={{ ...styles.btn, backgroundColor: "#004B94", marginTop: 12 }}
            onClick={handlePagarGenerales}
          >
            Pagar ahora (Generales)
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

      {pagoRealizado && (
        <button
          style={{ ...styles.btn, marginTop: 12 }}
          onClick={handleDescargarGenerales}
          disabled={descargando}
          title={mensajeDescarga || "Verificar y descargar"}
        >
          {descargando ? (mensajeDescarga || "Verificando…") : "Descargar Documento"}
        </button>
      )}
    </div>
  );
}

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
};
