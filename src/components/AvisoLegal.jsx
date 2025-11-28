// src/components/AvisoLegal.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";

const DEFAULT_MESSAGE = `Aviso legal: Esta plataforma es un software de apoyo informativo en traumatología. La información generada es orientativa y no sustituye la evaluación, el diagnóstico ni el tratamiento realizados por un profesional de la salud. Su uso no constituye consulta médica ni crea una relación médico-paciente.

Los datos ingresados se procesan únicamente para elaborar el documento solicitado y no se almacenan de forma permanente.

Se recomienda acudir a evaluación presencial con el/la especialista sugerido/a, llevando los exámenes indicados. Al continuar, usted declara haber leído y comprendido este aviso.`;

/**
 * Componente de aviso legal con Aceptar / Rechazar.
 * - Por defecto se muestra automáticamente si el usuario no lo ha aceptado antes.
 * - Guarda la aceptación en localStorage (configurable).
 *
 * Props:
 *  - title?: string
 *  - message?: string
 *  - visible?: boolean
 *  - initiallyOpen?: boolean
 *  - persist?: boolean
 *  - persistKey?: string
 *  - onAccept?: () => void
 *  - onReject?: () => void
 *  - lockScroll?: boolean
 *  - zIndex?: number
 *  - backdropClickToClose?: boolean
 */
export default function AvisoLegal({
  title = "Aviso legal",
  message = DEFAULT_MESSAGE,
  visible,                 // modo controlado (opcional)
  initiallyOpen,           // modo no controlado (opcional)
  persist = true,
  persistKey = "avisoLegalAceptado",
  onAccept,
  onReject,
  lockScroll = true,
  zIndex = 9999,
  backdropClickToClose = false,
}) {
  const isControlled = typeof visible === "boolean";
  const [open, setOpen] = useState(Boolean(visible));
  const firstBtnRef = useRef(null);

  // Determina si debe abrirse en modo no controlado
  useEffect(() => {
    if (isControlled) return;
    try {
      const yaAceptado = persist ? window.localStorage.getItem(persistKey) === "1" : false;
      const shouldOpen =
        typeof initiallyOpen === "boolean"
          ? initiallyOpen
          : !yaAceptado; // si no aceptó antes → abrir
      setOpen(shouldOpen);
    } catch {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza cuando es controlado
  useEffect(() => {
    if (isControlled) setOpen(Boolean(visible));
  }, [isControlled, visible]);

  // Bloquea scroll del body cuando está abierto
  useEffect(() => {
    if (!lockScroll) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open, lockScroll]);

  // Foco inicial
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        firstBtnRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleAccept = () => {
    try {
      if (persist) window.localStorage.setItem(persistKey, "1");
    } catch {}
    if (!isControlled) setOpen(false);
    onAccept?.();
  };

  const handleReject = () => {
    // 1) Si el padre definió un onReject, lo respetamos
    if (typeof onReject === "function") {
      onReject();
      return;
    }

    // 2) Comportamiento por defecto global: no acepta → volver atrás
    try {
      if (persist) window.localStorage.removeItem(persistKey);
    } catch {}

    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back(); // vuelve a la página anterior
      } else {
        window.location.href = "/"; // fallback: ir a inicio
      }
    }
  };

  const handleBackdrop = () => {
    if (backdropClickToClose) {
      if (!isControlled) setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-legal-title"
      onClick={handleBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay, rgba(0,0,0,0.45))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 95vw)",
          background: "var(--surface, #fff)",
          borderRadius: 12,
          boxShadow: "var(--shadow-md, 0 16px 50px rgba(0,0,0,0.25))",
          padding: 20,
          color: "var(--text, #1b1f24)",
          border: "1px solid var(--border, #e5e7eb)",
        }}
      >
        <h2
          id="aviso-legal-title"
          style={{
            margin: "0 0 12px",
            color: "var(--primary-dark, var(--primary))",
            fontSize: 20,
            fontWeight: 700,
            textAlign: "left",
          }}
        >
          {title}
        </h2>

        <div
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--text, #1f2937)",
            background: "var(--bg, #f8fafc)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 10,
            padding: 14,
          }}
        >
          {message.split("\n\n").map((p, i) => (
            <p key={i} style={{ margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
              {p}
            </p>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            ref={firstBtnRef}
            onClick={handleAccept}
            className="btn"
            style={{
              minWidth: 160,
            }}
          >
            Acepto y deseo continuar
          </button>
          <button
            onClick={handleReject}
            className="btn"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              minWidth: 160,
            }}
          >
            No acepto
          </button>
        </div>
      </div>
    </div>
  );
}
