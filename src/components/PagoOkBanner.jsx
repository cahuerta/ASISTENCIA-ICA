// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";

// Base del backend para el reset
const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE ||
  "https://asistencia-ica-backend.onrender.com";

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const ok = sp.get("pago") === "ok";
      const id = sp.get("idPago");
      setVisible(Boolean(ok && id));
    } catch {
      setVisible(false);
    }
  }, []);

  // Coloca este botón justo DESPUÉS del botón "Descargar Documento"
  useEffect(() => {
    if (!visible) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const candidates = Array.from(document.querySelectorAll("button, a"));
    const downloadBtn = candidates.find((el) =>
      /descargar\s+documento/i.test((el.textContent || "").trim())
    );

    if (downloadBtn && downloadBtn.parentNode) {
      downloadBtn.parentNode.insertBefore(wrap, downloadBtn.nextSibling);
    }
  }, [visible]);

  if (!visible) return null;

  const onClick = async () => {
    // === 1) Reset backend por idPago (URL → fallback sessionStorage)
    let idPago = "";
    try {
      const sp = new URLSearchParams(window.location.search);
      idPago = sp.get("idPago") || "";
    } catch {}
    if (!idPago) {
      try {
        idPago = sessionStorage.getItem("idPago") || "";
      } catch {}
    }

    if (idPago) {
      try {
        const resp = await fetch(
          `${BACKEND_BASE}/reset/${encodeURIComponent(idPago)}`,
          { method: "DELETE" }
        );
        if (!resp.ok) console.warn("RESET backend falló:", resp.status);
      } catch (e) {
        console.warn("Error al llamar RESET backend:", e);
      }
    }

    // === 2) Guardar SOLO datos básicos del paciente antes de limpiar
    let basicJSON = "";
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      const d = raw ? JSON.parse(raw) : {};
      const soloBasicos = {
        nombre: d?.nombre || "",
        rut: d?.rut || "",
        edad: d?.edad || "",
        genero: d?.genero || d?.sexo || "",
      };
      basicJSON = JSON.stringify(soloBasicos);
    } catch {
      basicJSON = "";
    }

    // === 3) Limpiar TODO el frontend (sessionStorage + localStorage)
    try {
      sessionStorage.clear();
    } catch {}
    try {
      // Si tu app no usa localStorage, no pasa nada.
      if (typeof localStorage !== "undefined" && localStorage.clear) {
        localStorage.clear();
      }
    } catch {}

    // Vuelve a dejar SOLO los datos básicos
    try {
      if (basicJSON) sessionStorage.setItem("datosPacienteJSON", basicJSON);
    } catch {}

    // === 4) Limpiar query params del pago
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("pago");
      u.searchParams.delete("idPago");
      u.searchParams.delete("modulo");
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch {}

    // === 5) Redirigir al inicio
    window.location.href = "/";
  };

  return (
    <div ref={wrapRef} className="pago-ok-wrap" style={{ marginTop: 12 }}>
      <button
        type="button"
        className="btn danger fullw pago-ok-btn"
        onClick={onClick}
      >
        Volver / Reiniciar
      </button>
    </div>
  );
}
