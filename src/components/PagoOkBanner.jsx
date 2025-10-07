// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PagoOkBanner() {
  const [holder, setHolder] = useState(null);
  const [btnClass, setBtnClass] = useState("btn btn-primary btn-block");
  const [show, setShow] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const findAnchor = () => {
      let a =
        document.querySelector("#btn-descargar-documento") ||
        document.querySelector("#btn-descargar") ||
        document.querySelector("[data-descargar-doc]") ||
        document.querySelector('[data-role="descargar-documento"]');
      if (!a) {
        const buttons = Array.from(document.querySelectorAll("button"));
        a = buttons.find((b) =>
          /descargar\s+(documento|pdf)/i.test((b.textContent || "").trim())
        );
      }
      return a;
    };

    let anchor = findAnchor();
    let attempts = 0;
    const iv = setInterval(() => {
      if (anchor || attempts++ > 20) {
        clearInterval(iv);
        if (!anchor) return;
        const cls = anchor.getAttribute("class") || "btn btn-primary btn-block";
        setBtnClass(cls);
        const h = document.createElement("div");
        h.className = "pago-ok-wrap";
        anchor.insertAdjacentElement("afterend", h);
        setHolder(h);
        const onClick = () => {
          try { sessionStorage.setItem("pdfDescargado", "1"); } catch {}
          setDownloaded(true);
        };
        anchor.addEventListener("click", onClick);
        // cleanup
        return () => {
          anchor.removeEventListener("click", onClick);
          if (h && h.parentNode) h.parentNode.removeChild(h);
        };
      }
      anchor = findAnchor();
    }, 150);

    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ok = sp.get("pago") === "ok";
    const id = sp.get("idPago");
    const flag = sessionStorage.getItem("pdfDescargado") === "1";
    setShow(Boolean(ok && id && (downloaded || flag)));
  }, [downloaded]);

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

  if (!holder || !show) return null;

  return createPortal(
    <button
      type="button"
      className={`${btnClass} pago-ok-btn`}
      onClick={onVolver}
      aria-label="Volver y reiniciar"
    >
      Volver / Reiniciar
    </button>,
    holder
  );
}
