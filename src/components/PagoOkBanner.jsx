// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useState } from "react";

/**
 * Botón “Volver / Reiniciar” (sin inline).
 * - Renderízalo DEBAJO del botón “Descargar Documento”.
 * - Se muestra si la URL trae ?pago=ok&idPago=...
 * - Al hacer clic: limpia sessionStorage, limpia query params y vuelve a "/".
 *
 * Estilos: usa clases para que tomen tu CSS/theme existente.
 *   Sugeridas: .pago-ok-wrap { margin-top: 8px; }
 *              .pago-ok-btn  { (puedes reutilizar tu clase primario) }
 *              o simplemente reaprovecha las que ya usas en tu botón principal.
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
    // limpiar estado local por si quedó algo
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

    // volver a inicio
    window.location.href = "/";
  };

  return (
    <div className="pago-ok-wrap">
      <button
        type="button"
        className="pago-ok-btn btn btn-primary"
        onClick={onVolver}
        aria-label="Volver y reiniciar"
      >
        Volver / Reiniciar
      </button>
    </div>
  );
}
