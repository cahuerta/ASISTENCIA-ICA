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

/* ===== BACKEND_BASE (igual al antiguo) ===== */
const BACKEND_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

/* ===== Normaliza solo para backend (misma función que usabas) ===== */
const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

/* =============================================================================
   APP — Orquestador usando PANTALLAS (compat con tu App antigua)
   - Mantiene mismas claves de storage:
     ICA_PACIENTE_BASICO, ICA_PREVIEW_IA, ICA_PREVIEW_ORDEN,
     ICA_AUTH, ICA_CODES, idPago, etc.
   - No cambia nombres de módulos ni props requeridas por ellos.
   - Navegación: p1 (Ingreso) → form (Formulario) → p2 (Selector/Módulos) → p3 (Previews)
   - Auto-navega a p3 si un módulo deja listo un preview (escucha cambios de storage).
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

  /* -------- Guest → Selector/Módulos --------
     Mantiene compat:
     - Deja ICA_AUTH / ICA_CODES si ya los define PantallaUno (no los reescribimos aquí).
     - Además setea un paciente mínimo para que el preview no quede vacío. */
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
    // Normaliza solo si tu backend lo requiere; guardamos igual que antes
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

  /* -------- Ir a Previews (Pantalla 3) bajo dos condiciones --------
     1) Cuando tú lo decidas en UI (si agregas un botón en módulos)
     2) Auto: si un módulo dejó ICA_PREVIEW_IA o ICA_PREVIEW_ORDEN en storage
        (esto mantiene compat con tu app antigua que “armaba” el preview en otras capas) */
  const goPreviews = useCallback(() => setPaso("p3"), []);

  /* Escucha cambios en storage para auto-navegar a p3 al tener un preview listo */
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
    // Al montar
    checkPreviews();
    // Cambios desde la misma pestaña
    const i = setInterval(checkPreviews, 400);
    // Cambios desde otras pestañas
    const onStorage = (e) => {
      if (e.key === "ICA_PREVIEW_IA" || e.key === "ICA_PREVIEW_ORDEN") {
        checkPreviews();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(i);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* -------- Opcional: hash #previews para compat con enlaces antiguos -------- */
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
          onIngresoPersonas={handleIngresoPersonas}
          onGuest={handleGuest}
          logoSrc="/assets/ica.jpg"
        />
      )}

      {/* ===== Formulario (sin “pantalla” extra) ===== */}
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
          // Nota: si algún módulo necesita llamar a p3, puede setear ICA_PREVIEW_IA/ORDEN
          // o bien hacer window.location.hash = "#previews". No cambiamos sus props.
        />
      )}

      {/* ===== Pantalla 3 — Previsualización y Descargas ===== */}
      {paso === "p3" && (
        <PantallaTres
          datosPaciente={datosPaciente}  // le llega igual que en tu app antigua
          onVolver={() => setPaso("p2")}
          // Los handlers onDescargar* / onRegenerar* los pasan tus módulos si los usas.
        />
      )}
    </div>
  );
}
