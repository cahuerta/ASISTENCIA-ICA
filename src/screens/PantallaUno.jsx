// src/screens/PantallaUno.jsx
"use client";
import React, { useState } from "react";
import "../app.css";
import { getTheme } from "../theme.js";

// ⚠️ Se asume que existe este componente.
// Si su nombre/ruta difiere, dímelo y lo ajusto SIN tocar la lógica.
import FormularioPacienteBasico from "../FormularioPacienteBasico.jsx";

const T = getTheme();
const cssVars = {
  "--bg": T.bg, "--surface": T.surface, "--border": T.border,
  "--text": T.text, "--text-muted": T.textMuted, "--muted": T.muted,
  "--primary": T.primary, "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
  "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm, "--shadow-md": T.shadowMd,
  "--overlay": T.overlay,
};

/**
 * Props esperadas (no impongo router, no cambio nombres):
 * - onIrPantallaDos?: (datosGuardados?: any) => void
 *   → Se llama al presionar "INVITADO" o al guardar el formulario básico.
 */
export default function PantallaUno({ onIrPantallaDos }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Guardar datos (si el formulario retorna un objeto) y avanzar a PantallaDos.
  const handleGuardadoBasico = (datos) => {
    try {
      if (datos && typeof datos === "object") {
        sessionStorage.setItem("datosPacienteJSON", JSON.stringify(datos));
      }
    } catch {}
    if (typeof onIrPantallaDos === "function") onIrPantallaDos(datos);
  };

  // En algunos casos el formulario puede no exponer onSave.
  // Este botón intenta continuar leyendo desde sessionStorage.
  const continuarDesdeStorage = () => {
    let datos = null;
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      datos = raw ? JSON.parse(raw) : null;
    } catch {}
    if (typeof onIrPantallaDos === "function") onIrPantallaDos(datos);
  };

  return (
    <div className="app" style={cssVars}>
      <div style={styles.wrap}>
        {/* ====== LOGO ====== */}
        <div style={styles.logoBox} aria-label="Logo">
          {/* Si tienes un <img> de logo, cámbialo aquí sin tocar estilos */}
          <div style={styles.logoText}>INSTITUTO DE CIRUGÍA ARTICULAR</div>
        </div>

        {/* ====== CONTENIDO ====== */}
        <div className="card" style={styles.card}>
          {!mostrarFormulario ? (
            <div style={styles.menu}>
              <h2 style={styles.title}>Bienvenido(a)</h2>
              <p style={styles.subtitle}>
                Elige cómo deseas continuar.
              </p>

              <div style={styles.btnRow}>
                <button
                  type="button"
                  className="btn"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={() => setMostrarFormulario(true)}
                >
                  INGRESO PERSONA
                </button>

                <button
                  type="button"
                  className="btn secondary"
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                  onClick={() => {
                    if (typeof onIrPantallaDos === "function") onIrPantallaDos(null);
                  }}
                >
                  INVITADO (GUEST)
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.formWrap}>
              <div style={styles.formHeader}>
                <h3 style={styles.formTitle}>Datos básicos del paciente</h3>
                <div>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ ...styles.smallBtn, ...styles.btnGhost }}
                    onClick={() => setMostrarFormulario(false)}
                  >
                    VOLVER
                  </button>
                </div>
              </div>

              {/* Módulo de formulario básico (no cambio su lógica) */}
              <div style={{ marginTop: 12 }}>
                <FormularioPacienteBasico
                  // Si este componente expone onSave / onSubmit / onComplete, lo capturamos:
                  onSave={handleGuardadoBasico}
                  onSubmit={handleGuardadoBasico}
                  onComplete={handleGuardadoBasico}
                />
              </div>

              {/* Botón alterno por si el formulario guarda directo en sessionStorage */}
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ ...styles.smallBtn, ...styles.btnPrimary }}
                  onClick={continuarDesdeStorage}
                >
                GUARDAR Y CONTINUAR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ====== Styles (usa theme) ====== */
const styles = {
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "32px 16px",
  },
  logoBox: {
    display: "grid",
    placeItems: "center",
    marginBottom: 18,
  },
  logoText: {
    fontWeight: 900,
    fontSize: 18,
    letterSpacing: 1,
    padding: "10px 14px",
    borderRadius: 12,
    background: T.surface,
    color: T.primary,
    border: `2px solid ${T.primary}`,
    boxShadow: T.shadowSm,
  },
  card: {
    padding: 18,
  },
  menu: {
    textAlign: "center",
  },
  title: {
    margin: "4px 0 8px",
    fontSize: 20,
    color: T.text,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: T.textMuted,
    fontSize: 14,
  },
  btnRow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    marginTop: 18,
  },
  btn: {
    width: "100%",
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 15,
    fontWeight: 800,
    borderWidth: 2,
    borderStyle: "solid",
    cursor: "pointer",
    lineHeight: 1.1,
  },
  btnPrimary: {
    background: T.primary,
    borderColor: T.primaryDark,
    color: T.onPrimary,
    boxShadow: `0 0 0 3px ${T.accentAlpha}, ${T.shadowSm}`,
  },
  btnSecondary: {
    background: T.surface,
    borderColor: T.primary,
    color: T.primary,
  },
  btnGhost: {
    background: T.surface,
    borderColor: T.border,
    color: T.text,
  },
  formWrap: {},
  formHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  formTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: T.text,
  },
  smallBtn: {
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
    borderWidth: 2,
    borderStyle: "solid",
    cursor: "pointer",
    lineHeight: 1.1,
  },
};
