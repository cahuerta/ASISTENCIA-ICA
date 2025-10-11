// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";

// ← NUEVO: base del backend para el reset
const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com";

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
    // ===== NUEVO: pedir al backend borrar lo asociado a idPago
    let idPago = "";
    try {
      const sp = new URLSearchParams(window.location.search);
      idPago = sp.get("idPago") || "";
    } catch {}
    if (idPago) {
      try {
        await fetch(`${BACKEND_BASE}/reset/${encodeURIComponent(idPago)}`, {
          method: "DELETE",
        });
      } catch {
        // si falla, continuamos igual (al menos se limpia el front)
      }
    }
    // ===== FIN CAMBIO

    try {
      const basic = sessionStorage.getItem("datosPacienteJSON");
      sessionStorage.clear();
      if (basic) sessionStorage.setItem("datosPacienteJSON", basic);
      sessionStorage.setItem("pantalla", "dos");
    } catch {}

    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("pago");
      u.searchParams.delete("idPago");
      u.searchParams.delete("modulo");
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch {}

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
