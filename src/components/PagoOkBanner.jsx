// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useState } from "react";

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);

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
    <div className="pago-ok-wrap">
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
