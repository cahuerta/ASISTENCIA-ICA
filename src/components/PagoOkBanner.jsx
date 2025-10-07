// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import "../app.css";            // usa TU css existente
import theme from "../theme.json"; // usa TU theme.json

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

  // Mapeo flexible desde tu theme.json -> CSS variables locales del banner
  const cssVars = useMemo(() => {
    const c  = theme?.colors || theme?.palette || {};
    const r  = theme?.radii || theme?.radius || {};
    const sp = theme?.spacing || theme?.space || {};
    return {
      "--pago-bg": c.surface || c.background || "#ffffff",
      "--pago-fg": c.text || c.foreground || "#111827",
      "--pago-border": c.border || "rgba(0,0,0,0.1)",
      "--pago-shadow": c.shadow || "rgba(0,0,0,0.12)",
      "--pago-radius": r.container || r.md || "12px",
      "--pago-pad": sp.padding || sp.md || "12px",
      "--pago-gap": sp.gap || sp.sm || "12px",
      "--pago-z": String(theme?.zIndex || 1000),
      "--pago-btn-radius": r.button || r.sm || "8px",
      "--pago-btn-border": c.btnBorder || c.border || "#e5e7eb",
      "--pago-btn-bg": c.btnBg || c.surface || "#ffffff",
      "--pago-btn-fg": c.btnText || c.text || "#111827",
      "--pago-btnY": sp.btnY || "8px",
      "--pago-btnX": sp.btnX || "12px",
      "--pago-primary-bg": c.primaryBg || c.primary || "#111827",
      "--pago-primary-fg": c.primaryText || "#ffffff",
      "--pago-primary-border": c.primaryBorder || c.primary || "#111827"
    };
  }, []);

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
    <div className="pagoOkBanner" style={cssVars} role="dialog" aria-live="polite">
      <div className="pagoOkBanner__title">✅ Pago confirmado</div>
      <div className="pagoOkBanner__meta">
        ID: {params.idPago} · Módulo: {params.modulo || "trauma"}
      </div>
      <div className="pagoOkBanner__actions">
        <button
          onClick={onDescargar}
          className="pagoOkBanner__btn pagoOkBanner__btn--primary"
          title="Descargar PDF"
        >
          Descargar PDF
        </button>
        <button
          onClick={onReiniciar}
          className="pagoOkBanner__btn"
          title="Borrar datos locales y volver al inicio"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
      }
