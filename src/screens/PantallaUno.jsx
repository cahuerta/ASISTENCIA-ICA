// src/screens/PantallaUno.jsx
"use client";
import React, { useState } from "react";
import "../app.css";
import { getTheme } from "../theme.js";
import FormularioPacienteBasico from "../FormularioPacienteBasico.jsx";
import logoICA from "../assets/ica.jpg"; // ← LOGO

const T = getTheme();
const cssVars = {
  "--bg": T.bg, "--surface": T.surface, "--border": T.border,
  "--text": T.text, "--text-muted": T.textMuted, "--muted": T.muted,
  "--primary": T.primary, "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
  "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm, "--shadow-md": T.shadowMd,
  "--overlay": T.overlay,
};

export default function PantallaUno({ onIrPantallaDos }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Lee lo que el propio formulario guardó en sessionStorage
  const continuar = () => {
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
        {/* ===== LOGO ===== */}
        <div style={styles.logoBox}>
          <img
            src={logoICA}
            alt="Instituto de Cirugía Articular"
            style={styles.logoImg}
          />
        </div>

        <div className="card" style={styles.card}>
          {!mostrarFormulario ? (
            <div style={styles.menu}>
              <h2 style={styles.title}>Bienvenido(a)</h2>
              <p style={styles.subtitle}>Elige cómo deseas continuar.</p>

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
                  onClick={() => onIrPantallaDos && onIrPantallaDos(null)}
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

              {/* El formulario maneja su propio estado y guarda en sessionStorage */}
              <div style={{ marginTop: 12 }}>
                <FormularioPacienteBasico />
              </div>

              <div style={{ marginTop: 16, textAlign: "right" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ ...styles.smallBtn, ...styles.btnPrimary }}
                  onClick={continuar}
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

/* ===== Styles ===== */
const styles = {
  wrap: {
