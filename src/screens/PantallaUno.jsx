// src/screens/PantallaUno.jsx
"use client";
import React, { useState } from "react";
import "../app.css";
import { getTheme } from "../theme.js";
import FormularioPacienteBasico from "../FormularioPacienteBasico.jsx";
import logoICA from "../assets/ica.jpg";

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

  const continuar = () => {
    let datos = null;
    try {
      const raw = sessionStorage.getItem("datosPacienteJSON");
      datos = raw ? JSON.parse(raw) : null;
    } catch {}
    if (typeof onIrPantallaDos === "function") onIrPantallaDos(datos);
  };

  // INVITADO: escribe los mismos campos que usa el resto de módulos
  const entrarComoInvitado = () => {
    const guest = { nombre: "guest", rut: "11.111.111-1", edad: 50, genero: "FEMENINO" };
    try { sessionStorage.setItem("datosPacienteJSON", JSON.stringify(guest)); } catch {}
    if (typeof onIrPantallaDos === "function") onIrPantallaDos(guest);
  };

  return (
    <div className="app" style={{ ...cssVars }}>
      <main style={styles.viewport}>
        <section style={styles.wrap}>
          {/* Header card: mismo ancho visual que la card de los botones */}
          <div style={styles.headerCard} aria-hidden="true">
            <img src={logoICA} alt="Instituto de Cirugía Articular" style={styles.logoImg} />
          </div>

          <div className="card" style={styles.card}>
            {!mostrarFormulario ? (
              <div style={styles.menu}>
                <h2 style={styles.title}>Bienvenido(a)</h2>
                <p style={styles.subtitle}>Elige cómo deseas continuar.</p>

                <div style={styles.btnCol}>
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
                    onClick={entrarComoInvitado}
                  >
                    INVITADO (GUEST)
                  </button>
                </div>

                {/* Aviso informativo (debajo de los botones) – UX refinada */}
                <section role="note" aria-label="Orientación inicial" style={styles.infoBox}>
                  {/* Acento lateral */}
                  <span aria-hidden="true" style={styles.infoAccent} />

                  {/* Icono + texto */}
                  <div style={styles.infoRow}>
                    <div style={styles.infoIconWrap} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9.5" stroke={T.primary} strokeWidth="1.2" fill="none"/>
                        <circle cx="12" cy="8.2" r="1" fill={T.primary}/>
                        <rect x="11.2" y="10.5" width="1.6" height="5.8" rx="0.8" fill={T.primary}/>
                      </svg>
                    </div>

                    <div style={styles.infoTextWrap}>
                      <div style={styles.infoKicker}>Orientación inicial</div>
                      <p style={styles.infoMain}>
                        Te orientamos según tus síntomas y zona de dolor, entregando una{" "}
                        <strong>orden médica sugerida</strong> para iniciar tu estudio o consulta.
                      </p>
                      <p style={styles.infoSub}>
                        No guardamos tu información y esta orientación no sustituye la evaluación profesional.
                      </p>
                    </div>
                  </div>
                </section>
                {/* /Aviso informativo */}
              </div>
            ) : (
              <div style={styles.formWrap}>
                <div style={styles.formHeader}>
                  <h3 style={styles.formTitle}>Datos básicos del paciente</h3>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ ...styles.smallBtn, ...styles.btnGhost }}
                    onClick={() => setMostrarFormulario(false)}
                  >
                    VOLVER
                  </button>
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
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ===== UI responsiva y alineada ===== */
const styles = {
  viewport: {
    minHeight: "100svh",
    display: "grid",
    placeItems: "start center",
    padding: "clamp(10px, 3vh, 28px) 12px",
  },
  wrap: { width: "min(94vw, 560px)" },

  headerCard: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    boxShadow: T.shadowSm,
    padding: "clamp(10px, 2vw, 14px)",
    marginBottom: "clamp(10px, 2.2vh, 14px)",
  },
  logoImg: {
    width: "100%",
    height: "auto",
    maxHeight: "220px",
    objectFit: "contain",
    display: "block",
    borderRadius: 10,
  },

  card: { padding: "clamp(12px, 2.2vw, 18px)" },

  menu: { textAlign: "center" },
  title: {
    margin: "0 0 clamp(6px, 1.2vh, 8px)",
    fontSize: "clamp(19px, 2.4vw, 24px)",
    color: T.text,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  subtitle: {
    margin: 0,
    color: T.textMuted,
    fontSize: "clamp(12px, 1.6vw, 14px)",
  },

  btnCol: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "clamp(8px, 1.2vw, 12px)",
    marginTop: "clamp(12px, 2vh, 16px)",
  },

  btn: {
    width: "100%",
    borderRadius: 12,
    padding: "clamp(11px, 1.9vw, 13px) clamp(12px, 2.2vw, 16px)",
    fontSize: "clamp(13px, 1.9vw, 16px)",
    fontWeight: 800,
    borderWidth: 2,
    borderStyle: "solid",
    cursor: "pointer",
    lineHeight: 1.1,
    letterSpacing: ".2px",
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

  /* ===== Aviso informativo refinado ===== */
  infoBox: {
    position: "relative",
    textAlign: "left",
    background: T.surface,                   // más claro, sin bloque oscuro
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: "12px 14px 12px 14px",
    marginTop: "clamp(12px, 2vh, 16px)",
    boxShadow: T.shadowSm,
  },
  infoAccent: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 3,
    background: T.primary,                   // acento lateral
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 10,
    alignItems: "start",
  },
  infoIconWrap: {
    width: 18,
    height: 18,
    marginTop: 3,
    opacity: 0.9,                            // sutil
  },
  infoTextWrap: {},
  infoKicker: {
    color: T.primary,
    fontSize: "clamp(11px, 1.5vw, 12px)",
    fontWeight: 800,
    letterSpacing: ".3px",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoMain: {
    margin: 0,
    color: T.text,
    fontSize: "clamp(13px, 1.8vw, 15px)",
    lineHeight: 1.45,
    fontWeight: 600,
  },
  infoSub: {
    margin: "6px 0 0",
    color: T.textMuted,
    fontSize: "clamp(12px, 1.6vw, 13px)",
    lineHeight: 1.35,
  },
  /* ===== /Aviso informativo ===== */

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
