// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import getTheme from "../theme.js"; // usa tu theme (lee theme.json por dentro)

// Igual que en PagoKhipu.jsx
const BACKEND_BASE =
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_BASE) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

function joinURL(base, path) {
  if (!base) return path;
  const b = String(base).replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

function endpointPDF(modulo, idPago) {
  switch (String(modulo || "").toLowerCase()) {
    case "trauma":    return `/pdf/${encodeURIComponent(idPago)}`;
    case "preop":     return `/pdf-preop/${encodeURIComponent(idPago)}`;
    case "generales": return `/pdf-generales/${encodeURIComponent(idPago)}`;
    case "ia":        return `/api/pdf-ia-orden/${encodeURIComponent(idPago)}`;
    default:          return `/pdf/${encodeURIComponent(idPago)}`;
  }
}

// Descarga + limpia estado local + limpia query + vuelve al home
async function descargarPDFGenerico(modulo, idPago, nombre = "documento.pdf") {
  const url = joinURL(BACKEND_BASE, endpointPDF(modulo, idPago));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Error al obtener el PDF (${r.status}) ${txt}`);
  }
  const blob = await r.blob();
  const dlUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = dlUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(dlUrl);

  // limpiar estado local para no validar automático al volver
  try {
    sessionStorage.removeItem("idPago");
    sessionStorage.removeItem("modulo");
    sessionStorage.removeItem("datosPacienteJSON");
  } catch {}

  // limpiar query
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("pago");
    u.searchParams.delete("idPago");
    u.searchParams.delete("modulo");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  } catch {}

  // volver al inicio
  window.location.href = "/";
}

/**
 * BOTÓN INLINE (no flotante).
 * Pon <PagoOkBanner /> justo DEBAJO del botón "Descargar Documento" de tu módulo.
 * Solo aparece si la URL trae ?pago=ok&idPago=...
 */
export default function PagoOkBanner() {
  const T = useMemo(() => getTheme(), []);
  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState({ pago: null, idPago: null, modulo: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const modulo = sp.get("modulo") || sessionStorage.getItem("modulo");
    const obj = { pago: sp.get("pago"), idPago: sp.get("idPago"), modulo };
    setParams(obj);
    setVisible(obj.pago === "ok" && !!obj.idPago);
  }, []);

  if (!visible) return null;

  const styleBtn = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${T.primaryDark}`,
    background: T.primary,
    color: T.onPrimary,
    boxShadow: T.shadowMd,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 8, // queda "abajo" del de descargar documento
  };

  const onDescargar = async () => {
    try {
      const nombre =
        (params.modulo || "trauma") === "trauma"
          ? "orden_imagenologia.pdf"
          : params.modulo === "preop"
          ? "preoperatorio.pdf"
          : params.modulo === "generales"
          ? "orden_generales.pdf"
          : "ordenIA.pdf";
      await descargarPDFGenerico(params.modulo || "trauma", params.idPago, nombre);
    } catch (e) {
      alert(e?.message || "No se pudo descargar el PDF");
    }
  };

  return (
    <button onClick={onDescargar} style={styleBtn} title="Descargar PDF nuevamente y reiniciar">
      Descargar PDF y Volver
    </button>
  );
}
