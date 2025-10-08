// src/screens/PantallaDos.jsx
"use client";
import React, { useState, useEffect } from "react";
import "../app.css";
import { getTheme } from "../theme.js";

/* Módulos (autosuficientes) */
import TraumaModulo from "../modules/TraumaModulo.jsx";
import PreopModulo from "../modules/PreopModulo.jsx";
import GeneralesModulo from "../modules/GeneralesModulo.jsx";
import IAModulo from "../modules/IAModulo.jsx";

/* Logo (header pequeño) */
import logoICA from "../assets/ica.jpg";

/**
 * PantallaDos
 * - Muestra los botones de módulos.
 * - Si venimos del pago (?pago=ok) o ya hay idPago, abre automáticamente el módulo
 *   que corresponde (por URL, por sessionStorage, o inferido del estado).
 * - Al seleccionar un módulo, lo monta directamente (PantallaDos “desaparece”).
 */
export default function PantallaDos({
  initialDatos,
  pagoOk = false,
  idPago = "",
  moduloActual = null, // opcional, puede venir desde App
}) {
  const T = getTheme();

  const cssVars = {
    "--bg": T.bg,
    "--surface": T.surface,
    "--border": T.border,
    "--text": T.text,
    "--text-muted": T.textMuted,
    "--muted": T.muted,
    "--primary": T.primary,
    "--primary-dark": T.primaryDark,
    "--onPrimary": T.onPrimary,
    "--accent-alpha": T.accentAlpha,
    "--shadow-sm": T.shadowSm,
    "--shadow-md": T.shadowMd,
    "--overlay": T.overlay,
  };

  // === Helpers ===
  const getQuery = () => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams("");
    }
  };

  const inferModuloFromState = () => {
    try {
      // Si ya hay uno guardado, usarlo
      const saved = sessionStorage.getItem("modulo");
      if (saved && ["trauma", "preop", "generales", "ia"].includes(saved)) return saved;

      // Heurísticas por estado persistido:
      // 1) Trauma (IA de trauma, puntos por zonas o dolor seleccionado)
      const traumaHasIA = !!sessionStorage.getItem("trauma_ia_examenes");
      const datosRaw = sessionStorage.getItem("datosPacienteJSON");
      const datos = datosRaw ? JSON.parse(datosRaw) : null;
      const hayDolor = !!datos?.dolor;
      const hayMarcadores =
        sessionStorage.getItem("rodilla_data") ||
        sessionStorage.getItem("mano_data") ||
        sessionStorage.getItem("hombro_data") ||
        sessionStorage.getItem("codo_data") ||
        sessionStorage.getItem("tobillo_data");
      if (traumaHasIA || hayDolor || hayMarcadores) return "trauma";

      // 2) Preop / Generales (resúmenes IA)
      if (sessionStorage.getItem("preop_ia_resumen")) return "preop";
      if (sessionStorage.getItem("generales_ia_resumen")) return "generales";

      // 3) IA texto libre
      if (sessionStorage.getItem("previewIA")) return "ia";
    } catch {}
    return null;
  };

  // Datos paciente (prop > sessionStorage)
  const datos =
    initialDatos ||
    (() => {
      try {
        const raw = sessionStorage.getItem("datosPacienteJSON");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  // ¿Debemos autoabrir?
  const [modulo, setModulo] = useState(() => {
    try {
      const q = getQuery();
      const returnedOk = q.get("pago") === "ok";
      const moduloFromURL = q.get("modulo");
      const storedId = sessionStorage.getItem("idPago") || "";
      const returning = returnedOk || !!pagoOk || !!idPago || !!storedId;

      // Prioridad: prop -> URL -> sessionStorage -> inferencia -> fallback
      const remembered =
        moduloActual ||
        (moduloFromURL && ["trauma", "preop", "generales", "ia"].includes(moduloFromURL)
          ? moduloFromURL
          : null) ||
        sessionStorage.getItem("modulo") ||
        inferModuloFromState();

      if (returning) {
        const toOpen = remembered || "trauma";
        // persistir para siguientes montajes
        try {
          sessionStorage.setItem("modulo", toOpen);
        } catch {}
        return toOpen;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Si detectamos retorno de pago después del primer render, abrir en caliente
  useEffect(() => {
    if (modulo) return;

    try {
      const q = getQuery();
      const returnedOk = q.get("pago") === "ok";
      const moduloFromURL = q.get("modulo");
      const storedId = sessionStorage.getItem("idPago") || "";
      const returning = returnedOk || !!pagoOk || !!idPago || !!storedId;

      if (returning) {
        const remembered =
          moduloActual ||
          (moduloFromURL && ["trauma", "preop", "generales", "ia"].includes(moduloFromURL)
            ? moduloFromURL
            : null) ||
          sessionStorage.getItem("modulo") ||
          inferModuloFromState() ||
          "trauma";
        try {
          sessionStorage.setItem("modulo", remembered);
        } catch {}
        setModulo(remembered);
      }
    } catch {}
  }, [modulo, pagoOk, idPago, moduloActual]);

  // En cuanto hay selección, renderizamos SOLO el módulo
  const mountProps = { initialDatos: datos || {} };
  if (modulo === "trauma") return <TraumaModulo {...mountProps} />;
  if (modulo === "preop") return <PreopModulo {...mountProps} />;
  if (modulo === "generales") return <GeneralesModulo {...mountProps} />;
  if (modulo === "ia") return <IAModulo {...mountProps} />;

  // UI de selección (sin módulo activo) — NUEVO LAYOUT:
  // Logo pequeño arriba → info paciente → botones → nota al final
  return (
    <div className="app" style={cssVars}>
      <div style={styles(T).wrap}>
        {/* Header con logo pequeño */}
        <div style={styles(T).headerRow}>
          <div style={styles(T).logoBadge}>
            <img src={logoICA} alt="Instituto de Cirugía Articular" style={styles(T).logoImg} />
          </div>
        </div>

        {/* Info paciente (nombre/RUT) */}
        <div className="card" style={styles(T).infoCard}>
          <div style={styles(T).infoText}>
            {datos?.nombre ? (
              <>
                Paciente: <strong>{datos.nombre}</strong>
                {datos.rut ? ` — RUT: ${datos.rut}` : ""}
              </>
            ) : (
              <>Ingrese sus datos en la pantalla anterior para personalizar la experiencia.</>
            )}
          </div>
        </div>

        {/* Botones de módulos */}
        <div style={styles(T).buttonsGrid}>
          {[
            { key: "trauma", label: "ASISTENTE TRAUMATOLÓGICO" },
            { key: "preop", label: "EXÁMENES PREQUIRÚRGICOS" },
            { key: "generales", label: "REVISIÓN GENERAL" },
            { key: "ia", label: "ANÁLISIS MEDIANTE IA" },
          ].map((b) => (
            <button
              key={b.key}
              type="button"
              className="btn"
              style={styles(T).btn}
              onClick={() => {
                try {
                  sessionStorage.setItem("modulo", b.key);
                } catch {}
                setModulo(b.key);
              }}
              aria-label={`Abrir ${b.label}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Nota/leyenda al final */}
        <div className="card" style={styles(T).noteCard}>
          <div style={styles(T).hintBox}>
            Elija un módulo para iniciar. Cada módulo usará los datos ya ingresados.
          </div>
        </div>

        {/* === Botón SALIR (al final, sin tocar nada más) === */}
        <div className="toolbar" style={{ flexDirection: "column", gap: 12, marginTop: 12 }}>
          <button
            type="button"
            className="btn danger fullw"
            onClick={async () => {
              const ok = window.confirm(
                "Se borrarán TODOS los datos (incluido el JSON del paciente) y se cerrará la aplicación. ¿Continuar?"
              );
              if (!ok) return;

              try { sessionStorage.clear(); } catch {}
              try { localStorage.clear(); } catch {}
              try {
                if ("caches" in window) {
                  const names = await caches.keys();
                  await Promise.all(names.map((n) => caches.delete(n)));
                }
              } catch {}
              try {
                if ("serviceWorker" in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                }
              } catch {}
              try {
                if (window.indexedDB && indexedDB.databases) {
                  const dbs = await indexedDB.databases();
                  await Promise.all(
                    (dbs || []).map((db) =>
                      db?.name
                        ? new Promise((res) => {
                            const req = indexedDB.deleteDatabase(db.name);
                            req.onsuccess = req.onerror = req.onblocked = () => res();
                          })
                        : Promise.resolve()
                    )
                  );
                }
              } catch {}

              try { window.open("", "_self"); window.close(); } catch {}
              try { window.location.replace("about:blank"); } catch { window.location.href = "about:blank"; }
            }}
          >
            Salir
          </button>
        </div>
        {/* === /Botón SALIR === */}
      </div>
    </div>
  );
}

/* ===== Estilos compactos y responsivos ===== */
function styles(T) {
  return {
    wrap: {
      maxWidth: 960,
      margin: "0 auto",
      padding: "clamp(12px,2vw,16px)",
    },

    /* Header con logo pequeño */
    headerRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "clamp(8px,1.6vw,12px)",
    },
    logoBadge: {
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      boxShadow: T.shadowSm,
      padding: "8px 10px",
    },
    logoImg: {
      display: "block",
      height: "48px",
      width: "auto",
      objectFit: "contain",
      borderRadius: 8,
    },

    /* Info paciente */
    infoCard: {
      padding: "clamp(10px,1.8vw,14px)",
      marginBottom: "clamp(8px,1.6vw,12px)",
    },
    infoText: {
      color: T.textMuted,
      fontSize: "clamp(12px,1.6vw,13px)",
    },

    /* Botones en grid responsivo */
    buttonsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "clamp(8px,1.4vw,12px)",
      marginBottom: "clamp(10px,1.8vw,14px)",
    },
    btn: {
      borderRadius: 12,
      padding: "clamp(10px,1.6vw,14px) clamp(12px,2.2vw,16px)",
      fontSize: "clamp(13px,1.9vw,15px)",
      fontWeight: 800,
      cursor: "pointer",
      borderWidth: 2,
      borderStyle: "solid",
      lineHeight: 1.1,
      background: T.surface,
      color: T.primary,
      borderColor: T.primary,
      boxShadow: `0 0 0 2px ${T.accentAlpha}, ${T.shadowSm}`,
    },

    /* Nota/leyenda al final */
    noteCard: {
      padding: "clamp(12px,2.2vw,16px)",
    },
    hintBox: {
      padding: 14,
      borderRadius: 10,
      border: `1px dashed ${T.border}`,
      color: T.textMuted,
      background: T.surface,
      textAlign: "center",
      fontSize: "clamp(12px,1.7vw,14px)",
    },
  };
}
