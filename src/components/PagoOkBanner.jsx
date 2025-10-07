// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import getTheme from "../theme.js"; // tu tema carga theme.json por dentro

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

  // limpiar query y volver al inicio
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("pago");
    u.searchParams.delete("idPago");
    u.searchParams.delete("modulo");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  } catch {}
  window.location.href = "/";
}

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);
  const T = useMemo(() => getTheme(), []);

  // Estilos 100% con tus tokens del tema
  const styleBanner = useMemo(() => ({
    position: "fixed",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 1000,
    background: T.surface,             // ✔ surface
    color: T.text,                     // ✔ text
    border: `1px solid ${T.border}`,   // ✔ border
    boxShadow: T.shadowMd,             // ✔ shadowMd
    borderRadius: 12,
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontFamily: "inherit",
  }), [T]);

  const styleBtn = useMemo(() => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${T.border}`,   // ✔ border
    background: T.surface,             // ✔ surface
    color: T.text,                     // ✔ text
    cursor: "pointer",
  }), [T]);

  const styleBtnPrimary = useMemo(() => ({
    ...styleBtn,
    background: T.primary,             // ✔ primary
    color: T.onPrimary,                // ✔ onPrimary
    borderColor: T.primaryDark,        // ✔ primaryDark
  }), [styleBtn, T]);

  const params = useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    return {
      pago: sp.get("pago"),
      idPago: sp.get("idPago"),
      modulo: sp.get("modulo") || sessionStorage.getItem("modulo"),
    };
  }, []);

  useEffect(() => {
    if (params.pago === "ok" && params.idPago) setVisible(true);
  }, [params]);

  if (!visible) return null;

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
      setVisible(false);
    } catch (e) {
      alert(e?.message || "No se pudo descargar el PDF");
    }
  };

  const onReiniciar = () => {
    try { sessionStorage.clear(); } catch {}
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
    <div style={styleBanner} role="dialog" aria-live="polite">
      <div style={{ fontWeight: 600 }}>✅ Pago confirmado</div>
      <div style={{ opacity: 0.8 }}>
        ID: {params.idPago} · Módulo: {params.modulo || "trauma"}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button onClick={onDescargar} style={styleBtnPrimary} title="Descargar PDF">
          Descargar PDF
        </button>
        <button onClick={onReiniciar} style={styleBtn} title="Borrar datos y volver al inicio">
          Reiniciar
        </button>
      </div>
    </div>
  );
}
