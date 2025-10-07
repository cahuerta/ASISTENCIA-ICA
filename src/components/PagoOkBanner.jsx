// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useState } from "react";

/**
 * Botón “Volver / Reiniciar”
 * - SIN estilos inline: usa tus clases globales (btn, btn-primary, btn-block).
 * - Colócalo DEBAJO del botón “Descargar Documento” en el mismo módulo.
 * - Se muestra solo si la URL trae ?pago=ok&idPago=...
 * - Al hacer clic: limpia estado local, limpia query params y vuelve a "/".
 */

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const pagoOk = sp.get("pago") === "ok";
    const idPago = sp.get("idPago");
    setVisible(Boolean(pagoOk && idPago));
  }, []);

  if (!visible) return null;

  const onVolver = () => {
    // limpiar estado local principal
    try {
      sessionStorage.removeItem("pdfDescargado");
      sessionStorage.removeItem("idPago");
      sessionStorage.removeItem("modulo");
      sessionStorage.removeItem("datosPacienteJSON");
    } catch {}

    // limpiar parámetros de la URL
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("pago");
      u.searchParams.delete("idPago");
      u.searchParams.delete("modulo");
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch {}

    // volver al inicio
    window.location.href = "/";
  };

  return (
    <div className="pago-ok-wrap">
      <button
        type="button"
        className="btn btn-primary btn-block pago-ok-btn"
        onClick={onVolver}
        aria-label="Volver y reiniciar"
      >
        Volver / Reiniciar
      </button>
    </div>
  );
}
