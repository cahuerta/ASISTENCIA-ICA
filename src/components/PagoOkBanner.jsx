// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useState } from "react";

/**
 * Botón “Volver / Reiniciar” (sin estilos inline).
 * - Debe renderizarse DEBAJO del botón “Descargar Documento” del módulo.
 * - Se muestra SOLO si venimos de ?pago=ok&idPago=... y ya se descargó el PDF.
 *   (el helper de descarga debe guardar sessionStorage.setItem('pdfDescargado','1'))
 * - Al hacer clic: limpia estado local, limpia query params y vuelve a "/".
 *
 * Reutiliza tus clases globales (.btn .btn-primary, etc.) definidas en app.css/theme.
 */

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      const sp = new URLSearchParams(window.location.search);
      const pagoOk = sp.get("pago") === "ok";
      const idPago = sp.get("idPago");
      const descargado = sessionStorage.getItem("pdfDescargado") === "1";
      setVisible(Boolean(pagoOk && idPago && descargado));
    };

    // Chequeo inmediato + polling corto por si el flag se setea tras la descarga
    check();
    const iv = setInterval(check, 400);
    return () => clearInterval(iv);
  }, []);

  if (!visible) return null;

  const onVolver = () => {
    try { sessionStorage.removeItem("pdfDescargado"); } catch {}
    try {
      sessionStorage.removeItem("idPago");
      sessionStorage.removeItem("modulo");
      sessionStorage.removeItem("datosPacienteJSON");
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
    <div className="pago-ok-wrap">
      <button
        type="button"
        className="btn btn-primary pago-ok-btn"
        onClick={onVolver}
        aria-label="Volver y reiniciar"
      >
        Volver / Reiniciar
      </button>
    </div>
  );
}

/* 
Sugerencia (opcional) en tu app.css para ajustar el margen inferior:
.pago-ok-wrap { margin-top: 8px; }
.pago-ok-btn  { /* hereda colores de .btn .btn-primary definidos por tu theme * / }
*/
