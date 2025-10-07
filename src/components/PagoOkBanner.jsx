// src/components/PagoOkBanner.jsx
"use client";
import React from "react";

export default function PagoOkBanner({
  className = "btn btn-primary btn-block",
  redirectTo = "/",
  children = "Volver / Reiniciar",
  onlyWhenPagoOk = true,
}) {
  const shouldShow = (() => {
    if (!onlyWhenPagoOk) return true;
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("pago") === "ok" && !!(sp.get("idPago") || sessionStorage.getItem("idPago"));
    } catch {
      return false;
    }
  })();

  if (!shouldShow) return null;

  const onClick = () => {
    try {
      sessionStorage.removeItem("idPago");
      sessionStorage.removeItem("modulo");
      sessionStorage.removeItem("datosPacienteJSON");
      sessionStorage.removeItem("pantalla");
      sessionStorage.removeItem("trauma_ia_examenes");
      sessionStorage.removeItem("trauma_ia_diagnostico");
      sessionStorage.removeItem("trauma_ia_justificacion");
      sessionStorage.removeItem("resonanciaChecklist");
      sessionStorage.removeItem("resonanciaResumenTexto");
      sessionStorage.removeItem("ordenAlternativa");
    } catch {}

    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("pago");
      u.searchParams.delete("idPago");
      u.searchParams.delete("modulo");
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch {}

    window.location.href = redirectTo; // vuelve a PantallaUno
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}
