// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";

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

    // Busca el botón/anchor cuyo texto diga "Descargar Documento"
    const candidates = Array.from(document.querySelectorAll("button, a"));
    const downloadBtn = candidates.find((el) =>
      /descargar\s+documento/i.test((el.textContent || "").trim())
    );

    if (downloadBtn && downloadBtn.parentNode) {
      // Inserta el contenedor después del botón de descarga
      downloadBtn.parentNode.insertBefore(wrap, downloadBtn.nextSibling);
    }
  }, [visible]);

  if (!visible) return null;

  const onClick = () => {
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
        className="btn btn-primary btn-block pago-ok-btn"
        onClick={onClick}
      >
        Volver / Reiniciar
      </button>
    </div>
  );
}
