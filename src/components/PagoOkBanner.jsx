// src/components/PagoOkBanner.jsx
"use client";
import React, { useMemo } from "react";

export default function PagoOkBanner() {
  // Muestra el botón solo si venimos con ?pago=ok&idPago=...
  const show = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("pago") === "ok" && !!sp.get("idPago");
  }, []);

  if (!show) return null;

  const onVolver = () => {
    // limpiar estado local para no validar automático al volver
    try {
      sessionStorage.removeItem("idPago");
      sessionStorage.removeItem("modulo");
      sessionStorage.removeItem("datosPacienteJSON");
      sessionStorage.removeItem("pantalla");
    } catch {}

    // limpiar la query
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("pago");
      u.searchParams.delete("idPago");
      u.searchParams.delete("modulo");
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch {}

    // ir a PantallaUno
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      className="btn btn-primary btn-block"
      onClick={onVolver}
    >
      Volver / Reiniciar
    </button>
  );
}
