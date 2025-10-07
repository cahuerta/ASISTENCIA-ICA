// src/components/PagoOkBanner.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

/* Detecta BACKEND_BASE igual que en PagoKhipu.jsx */
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

  // limpiar idPago local para no validar automático al volver
  try { sessionStorage.removeItem("idPago"); } catch {}
  // opcional: limpiar ?pago=... de la URL para que no reaparezca el banner
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("pago");
    u.searchParams.delete("idPago");
    u.searchParams.delete("modulo");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  } catch {}
}

export default function PagoOkBanner() {
  const [visible, setVisible] = useState(false);

  const params = useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    return {
      pago: sp.get("pago"),
      idPago: sp.get("idPago"),
      modulo: sp.get("modulo") || (typeof window !== "undefined" ? sessionStorage.getItem("modulo") : null),
    };
  }, []);

  useEffect(() => {
    if (params.pago === "ok" && params.idPago) setVisible(true);
  }, [params]);

  if (!visible) return null;

  const onDescargar = async () => {
    try {
      const nombre = (params.modulo || "trauma") === "trauma"
        ? "orden_imagenologia.pdf"
        : (params.modulo === "preop"
          ? "preoperatorio.pdf"
          : (params.modulo === "generales"
            ? "orden_generales.pdf"
            : "ordenIA.pdf"));
      await descargarPDFGenerico(params.modulo || "trauma", params.idPago, nombre);
      setVisible(false);
    } catch (e) {
      alert(e?.message || "No se pudo descargar el PDF");
    }
  };

  const onReiniciar = () => {
    try { sessionStorage.clear(); } catch {}
    // limpiar query y volver al inicio
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
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1000,
        background: "white",
        border: "1px solid rgba(0,0,0,0.1)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontWeight: 600 }}>
        ✅ Pago confirmado
      </div>
      <div style={{ opacity: 0.8 }}>
        ID: {params.idPago} · Módulo: {params.modulo || "trauma"}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button
          onClick={onDescargar}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#111827",
            color: "white",
            cursor: "pointer",
          }}
          title="Descargar PDF"
        >
          Descargar PDF
        </button>
        <button
          onClick={onReiniciar}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
          }}
          title="Borrar datos locales y volver al inicio"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
