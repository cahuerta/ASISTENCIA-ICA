// src/App.jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import "./app.css";

/* ===== Pantallas y Form ===== */
import PantallaUno from "./screens/PantallaUno.jsx";                 // Ingreso (logo + Guest / Ingreso Personas)
import PantallaDos from "./screens/PantallaDos.jsx";                 // Selector + render directo de módulos
import PantallaTres from "./screens/PantallaTres.jsx";               // Previews (IA / Orden) + descargas
import FormularioPacienteBasico from "./FormularioPacienteBasico.jsx";

/* ===== Tema (mismas variables que tu app antigua) ===== */
import { getTheme } from "./theme.js";
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

/* ===== BACKEND_BASE (compat con tu app) ===== */
const BACKEND_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

/* ===== Normalización para backend (igual que usabas) ===== */
const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

/* =============================================================================
   APP — Orquestador usando PANTALLAS (compatible con módulos y claves existentes)
   - Claves de storage mantenidas:
     ICA_PACIENTE_BASICO, ICA_PREVIEW_IA, ICA_PREVIEW_ORDEN,
     ICA_AUTH, ICA_CODES, idPago, etc.
   - Navegación: p1 (Ingreso) → form (Formulario) → p2 (Selector/Módulos) → p3 (Previews)
============================================================================= */
export default function App() {
  /* -------- Paso actual -------- */
  const [paso, setPaso] = useState("p1"); // "p1" | "form" | "p2" | "p3"

  /* -------- Estado global del paciente (misma clave) -------- */
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ICA_PACIENTE_BASICO") || "{}");
    } catch {
      return {};
    }
  });

  /* -------- Sincronía con storage (por si módulos escriben directo) -------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ICA_PACIENTE_BASICO");
      if (raw) setDatosPaciente(JSON.parse(raw));
    } catch {}
  }, []);

  /* -------- Util: guardar paciente con misma clave -------- */
  const persistPaciente = useCallback((obj) => {
    try {
      localStorage.setItem("ICA_PACIENTE_BASICO", JSON.stringify(obj || {}));
    } catch {}
  }, []);

  /* -------- Ingreso Personas → Formulario -------- */
  const handleIngresoPersonas = useCallback(() => setPaso("form"), []);

  /* -------- Guest → Selector/Módulos -------- */
  const handleGuest = useCallback(() => {
    const dummy = {
      nombre: "INVITADO",
      rut: "",
      edad: "",
      genero: "",
      dolor: "",
      lado: "",
    };
    setDatosPaciente(dummy);
    persistPaciente(dummy);
    setPaso("p2");
  }, [persistPaciente]);

  /* -------- FormularioPacienteBasico -------- */
  const onCambiarDato = useCallback((campo, valor) => {
    setDatosPaciente((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const onSubmitPaciente = useCallback(() => {
    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = {
      ...datosPaciente,
      edad: edadNum,
      genero: normalizarGenero(datosPaciente.genero),
    };
    setDatosPaciente(paciente);
    persistPaciente(paciente);
    setPaso("p2");
  }, [datosPaciente, persistPaciente]);

  /* -------- Auto-navegar a p3 si hay preview listo (compat) -------- */
  useEffect(() => {
    const checkPreviews = () => {
      try {
        const ia = localStorage.getItem("ICA_PREVIEW_IA");
        const orden = localStorage.getItem("ICA_PREVIEW_ORDEN");
        if ((ia && ia.length > 0) || (orden && orden.length > 0)) {
          setPaso("p3");
        }
      } catch {}
    };
    checkPreviews();
    const i = setInterval(checkPreviews, 400);
    const onStorage = (e) => {
      if (e.key === "ICA_PREVIEW_IA" || e.key === "ICA_PREVIEW_ORDEN") checkPreviews();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(i);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* -------- Compat con hash #previews -------- */
  useEffect(() => {
    const applyHash = () => {
      if (window.location.hash === "#previews") setPaso("p3");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  /* --------------------------------- RENDER --------------------------------- */
  return (
    <div className="app" style={cssVars}>
      {/* ===== Pantalla 1 — Ingreso ===== */}
      {paso === "p1" && (
        <PantallaUno
          onIngresoPersonas={handleIngresoPersonas} // preferido
          onContinuar={handleIngresoPersonas}       // compat con versiones antiguas
          onGuest={handleGuest}
          // logoSrc se resuelve dentro de PantallaUno con import desde src/assets/ica.jpg
        />
      )}

      {/* ===== Formulario (sin “pantalla” intermedia) ===== */}
      {paso === "form" && (
        <div className="card">
          <div className="section">
            <h1 className="h1">Ingreso Personas · Datos básicos</h1>
            <button className="btn secondary nowrap" onClick={() => setPaso("p1")}>
              Volver
            </button>
          </div>
          <div className="divider" />
          <FormularioPacienteBasico
            datos={datosPaciente}
            onCambiarDato={onCambiarDato}
            onSubmit={onSubmitPaciente}
            modoInvitado={false}
          />
        </div>
      )}

      {/* ===== Pantalla 2 — Selector y Módulos (render directo) ===== */}
      {paso === "p2" && (
        <PantallaDos
          initialDatos={datosPaciente}   // los módulos reciben lo mismo que antes
          onVolver={() => setPaso("p1")}
        />
      )}

      {/* ===== Pantalla 3 — Previsualización y Descargas ===== */}
      {paso === "p3" && (
        <PantallaTres
          datosPaciente={datosPaciente}
          onVolver={() => setPaso("p2")}
        />
      )}
    </div>
  );
}
