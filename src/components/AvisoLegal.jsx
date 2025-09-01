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
 *  - title?: string                       (por defecto "Aviso legal")
 *  - message?: string                     (texto del aviso)
 *  - visible?: boolean                    (modo controlado; si lo pasas, tú controlas abrir/cerrar)
 *  - initiallyOpen?: boolean              (modo no-controlado; por defecto auto según persistencia)
 *  - persist?: boolean                    (guardar aceptación en localStorage, default: true)
 *  - persistKey?: string                  (clave localStorage, default: "avisoLegalAceptado")
 *  - onAccept?: () => void                (callback al aceptar)
 *  - onReject?: () => void                (callback al rechazar)
 *  - lockScroll?: boolean                 (bloquea scroll del body cuando está abierto; default true)
 *  - zIndex?: number                      (z-index del modal, default 9999)
 *  - backdropClickToClose?: boolean       (cerrar al click en fondo; default false)
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
    // No cerramos automáticamente al rechazar: deja la decisión al padre
    onReject?.();
  };

  const handleBackdrop = () => {
    if (backdropClickToClose) {
      // Si decides permitir cierre por fondo (no recomendado para avisos legales estrictos)
      if (!isControlled) setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-legal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex,
      }}
      onClick={handleBackdrop}
    >
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="aviso-legal-title" style={styles.title}>{title}</h2>

        <div style={styles.content}>
          {message.split("\n\n").map((p, i) => (
            <p key={i} style={{ margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
              {p}
            </p>
          ))}
        </div>

        <div style={styles.actions}>
          <button
            ref={firstBtnRef}
            onClick={handleAccept}
            style={{ ...styles.btn, ...styles.primary }}
          >
            Acepto y deseo continuar
          </button>
          <button
            onClick={handleReject}
            style={{ ...styles.btn, ...styles.secondary }}
          >
            No acepto
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    width: "min(720px, 95vw)",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
    padding: 20,
    color: "#1b1f24",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  title: {
    margin: "0 0 12px",
    color: "#0a2b5e",
    fontSize: 20,
    fontWeight: 700,
    textAlign: "left",
  },
  content: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "#1f2937",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
  },
  actions: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  btn: {
    cursor: "pointer",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid transparent",
    fontSize: 14,
    minWidth: 160,
  },
  primary: {
    background: "#004B94",
    color: "#fff",
    borderColor: "#004B94",
  },
  secondary: {
    background: "#fff",
    color: "#374151",
    borderColor: "#d1d5db",
  },
};
