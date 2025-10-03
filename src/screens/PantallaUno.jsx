// src/screens/PantallaUno.jsx
"use client";
import React, { useState } from "react";
import "../app.css";
import { getTheme } from "../theme.js";
import FormularioPacienteBasico from "../FormularioPacienteBasico.jsx";
import logoICA from "../assets/ica.jpg"; // LOGO

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

  // Avanza a PantallaDos leyendo lo que guardó el formulario en sessionStorage
  const continuar = () => {
    let datos = null;
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      datos = raw ? JSON.parse(raw) : null;
    } catch {}
    if (typeof onIrPantallaDos === "function") onIrPantallaDos(datos);
  };

  return (
    <div className="app" style={{ ...cssVars }}>
      <div style={styles.viewport}>
        <div style={styles.wrap}>
          {/* LOGO responsivo */}
          <div style={styles.logoBox}>
            <img src={logoICA} alt="Instituto de Cirugía Articular" style={styles.logoImg} />
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

                {/* El formulario es autónomo; al enviar navega a PantallaDos */}
                <div style={{ marginTop: 12 }}>
                  <FormularioPacienteBasico
                    onSubmit={(e) => {
                      e.preventDefault();
                      continuar();
                    }}
                  />
                </div>
                {/* Sin botón extra */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Styles responsivos (web y móvil) ===== */
const styles = {
  // Centrado vertical en pantallas altas, con padding seguro en móviles
  viewport: {
    minHeight: "100svh",
    display: "grid",
    placeItems: "start center",
    padding: "clamp(12px, 3vh, 32px) 12px",
  },

  // Contenedor fluido: se adapta entre móvil y desktop
  wrap: {
    width: "min(92vw, 520px)",
  },

  logoBox: {
    display: "grid",
    placeItems: "center",
    marginBottom: "clamp(8px, 2.5vh, 18px)",
  },
  // Escala con el ancho de pantalla
  logoImg: {
    height: "clamp(84px, 18vw, 140px)",
    objectFit: "contain",
    borderRadius: 12,
    boxShadow: T.shadowSm,
  },

  card: {
    padding: "clamp(12px, 2.2vw, 18px)",
  },

  menu: { textAlign: "center" },

  title: {
    margin: "0 0 clamp(6px, 1.2vh, 8px)",
    fontSize: "clamp(18px, 2.4vw, 22px)",
    color: T.text,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  subtitle: {
    margin: 0,
    color: T.textMuted,
    fontSize: "clamp(12px, 1.6vw, 14px)",
  },

  // Pasa de 1 columna (móvil) a 2 cuando hay espacio
  btnRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "clamp(8px, 1.2vw, 12px)",
    marginTop: "clamp(12px, 2vh, 16px)",
  },

  // Botones compactos y fluidos
  btn: {
    width: "100%",
    borderRadius: 12,
    padding: "clamp(10px, 1.8vw, 14px) clamp(12px, 2.4vw, 16px)",
    fontSize: "clamp(13px, 1.9vw, 16px)",
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
    boxShadow: `0 0 0 2px ${T.accentAlpha}, ${T.shadowSm}`,
  },
  btnSecondary: {
    background: T.surface,
    borderColor: T.primary,
    color: T.primary,
  },
  btnGhost: { background: T.surface, borderColor: T.border, color: T.text },

  formWrap: {},

  formHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  formTitle: {
    margin: 0,
    fontSize: "clamp(14px, 1.9vw, 16px)",
    fontWeight: 800,
    color: T.text,
  },
  smallBtn: {
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: "clamp(12px, 1.7vw, 13px)",
    fontWeight: 800,
    borderWidth: 2,
    borderStyle: "solid",
    cursor: "pointer",
    lineHeight: 1.05,
  },
};
