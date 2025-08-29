"use client";
import React, { useEffect, useRef, useState } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

// Lista EXACTA indicada por ti (en ese orden, sin Rx de tórax, sin extras)
const EXAMENES_FIJOS = [
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

export default function PreopModulo({ initialDatos }) {
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // al montar: sincroniza datos, detecta retorno de pago
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
      // warm-up al backend de preop
      if (pollerRef.current) clearInterval(pollerRef.current);
      let intentos = 0;
      pollerRef.current = setInterval(async () => {
        intentos++;
        try { await fetch(`${BACKEND_BASE}/obtener-datos-preop/${idPago}`); } catch {}
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

  // Pagar ahora (PREOP)
  const handlePagarPreop = async () => {
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

    try {
      const idPago = sessionStorage.getItem("idPago") ||
        ("preop_" + Date.now() + "_" + Math.floor(Math.random() * 10000));

      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("modulo", "preop");
      sessionStorage.setItem("datosPacienteJSON", JSON.stringify({ ...datos, edad: edadNum }));

      // guarda en backend PREOP
      await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, datosPaciente: { ...datos, edad: edadNum } }),
      });

      // redirige a Khipu
      await irAPagoKhipu({ ...datos, edad: edadNum, idPago });
    } catch (err) {
      console.error("No se pudo generar el link de pago (preop):", err);
      alert(`No se pudo generar el link de pago.\n${err?.message || err}`);
    }
  };

  // Descargar PDF PREOP (1 archivo, 2 páginas)
  const handleDescargarPreop = async () => {
    const idPago = sessionStorage.getItem("idPago");
    if (!idPago) {
      alert("ID de pago no encontrado");
      return;
    }

    const intentaDescarga = async () => {
      const res = await fetch(`${BACKEND_BASE}/pdf-preop/${idPago}`, { cache: "no-store" });
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
          if (i === maxIntentos) alert("El pago aún no se confirma. Intenta nuevamente en unos segundos.");
          continue;
        }

        if (r.status === 404) {
          // backend reiniciado → reinyecta una sola vez y reintenta
          if (!reinyectado) {
            setMensajeDescarga("Restaurando datos…");
            const respaldo = sessionStorage.getItem("datosPacienteJSON");
            const datosReinyectar = respaldo ? JSON.parse(respaldo) : datos;

            await fetch(`${BACKEND_BASE}/guardar-datos-preop`, {
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

  // Simular pago (guest) para pruebas
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

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Vista previa — Exámenes preoperatorios</h3>

      <div style={{ marginBottom: 10 }}>
        <div><strong>Paciente:</strong> {datos?.nombre || "—"}</div>
        <div><strong>RUT:</strong> {datos?.rut || "—"}</div>
        <div><strong>Edad:</strong> {datos?.edad || "—"}</div>
        <div>
          <strong>Clínica:</strong>{" "}
          {`Dolor en ${(datos?.dolor || "")}${datos?.lado ? ` ${datos.lado}` : ""}`.trim() || "—"}
        </div>
      </div>

      <div>
        <strong>Solicitados (LAB/ECG):</strong>
        <ul style={{ marginTop: 6 }}>
          {EXAMENES_FIJOS.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 12, fontStyle: "italic" }}>
        * La descarga final es <strong>un solo PDF</strong> con <strong>2 páginas</strong>:
        (1) Orden LAB/ECG y (2) Evaluación Odontológica.
      </div>

      {/* Controles */}
      {!pagoRealizado && (
        <>
          <button
            style={{ ...styles.btn, backgroundColor: "#004B94", marginTop: 12 }}
            onClick={handlePagarPreop}
          >
            Pagar ahora (Pre Op)
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
          onClick={handleDescargarPreop}
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
