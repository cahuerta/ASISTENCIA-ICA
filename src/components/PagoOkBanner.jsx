// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Botón “Volver / Reiniciar” que se RENDERIZA JUSTO ABAJO
 * del botón existente “Descargar Documento” (o “Descargar PDF”).
 *
 * - Sin estilos inline: usa tus clases (.btn .btn-primary .btn-block).
 * - No requiere cambiar otros archivos: se ancla por DOM/portal.
 * - Se muestra solo si la URL trae ?pago=ok&idPago=...
 * - Al hacer clic: limpia sessionStorage, limpia los query params y vuelve a "/".
 */

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1) Mostrar solo si venimos de pago OK
    const sp = new URLSearchParams(window.location.search);
    const pagoOk = sp.get("pago") === "ok";
    const idPago = sp.get("idPago");
    setVisible(Boolean(pagoOk && idPago));

    // 2) Buscar el botón de "Descargar Documento"/"Descargar PDF" ya existente
    let anchor =
      document.querySelector("#btn-descargar-documento") ||
      document.querySelector("#btn-descargar") ||
      document.querySelector("[data-descargar-doc]") ||
      document.querySelector('[data-role="descargar-documento"]');

    if (!anchor) {
      const buttons = Array.from(document.querySelectorAll("button"));
      anchor = buttons.find((b) =>
        /descargar\s+(documento|pdf)/i.test((b.textContent || "").trim())
      );
    }
    if (!anchor) return; // si no hay botón de descarga, no montamos nada

    // 3) Crear un contenedor inmediatamente DESPUÉS del botón de descarga
    const holderId = "pago-ok-anchor";
    let holder = document.getElementById(holderId);
    if (!holder) {
      holder = document.createElement("div");
      holder.id = holderId;
      holder.className = "pago-ok-wrap"; // usa tu CSS (ej: margen-top)
      anchor.insertAdjacentElement("afterend", holder);
    }
    setMountNode(holder);

    // Limpieza al desmontar
    return () => {
      const node = document.getElementById(holderId);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    };
  }, []);

  const onVolver = () => {
    try {
      sessionStorage.removeItem("pdfDescargado");
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

  if (!visible || !mountNode) return null;

  return createPortal(
    <button
      type="button"
      className="btn btn-primary btn-block pago-ok-btn"
      onClick={onVolver}
      aria-label="Volver y reiniciar"
    >
      Volver / Reiniciar
    </button>,
    mountNode
  );
}

/* CSS sugerido (opcional) en tu app.css:
.pago-ok-wrap { margin-top: 8px; }
.pago-ok-btn  { /* hereda de .btn .btn-primary .btn-block * / }
*/
