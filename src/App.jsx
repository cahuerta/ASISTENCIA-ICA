// src/App.jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import "./app.css";

import PantallaUno from "./screens/PantallaUno.jsx";
import PantallaDos from "./screens/PantallaDos.jsx";
import PantallaTres from "./screens/PantallaTres.jsx";
import FormularioPacienteBasico from "./FormularioPacienteBasico.jsx";

import { getTheme } from "./theme.js";
const T = getTheme();
const cssVars = {
  "--bg": T.bg, "--surface": T.surface, "--border": T.border, "--text": T.text,
  "--text-muted": T.textMuted, "--muted": T.muted, "--primary": T.primary,
  "--primary-dark": T.primaryDark, "--onPrimary": T.onPrimary,
  "--accent-alpha": T.accentAlpha, "--shadow-sm": T.shadowSm,
  "--shadow-md": T.shadowMd, "--overlay": T.overlay,
};

const BACKEND_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_BASE) ||
  (typeof window !== "undefined" && window.__ENV__?.BACKEND_BASE) ||
  "https://asistencia-ica-backend.onrender.com";

const normalizarGenero = (g = "") => {
  const s = String(g).trim().toLowerCase();
  if (s === "masculino" || s === "hombre") return "hombre";
  if (s === "femenino" || s === "mujer") return "mujer";
  return s;
};

export default function App() {
  const [paso, setPaso] = useState("p1"); // p1 (ingreso) | form | p2 (módulos) | p3 (previews)

  // ====== Estado global de paciente (misma clave) ======
  const [datosPaciente, setDatosPaciente] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ICA_PACIENTE_BASICO") || "{}"); }
    catch { return {}; }
  });
  const persistPaciente = useCallback((obj) => {
    try { localStorage.setItem("ICA_PACIENTE_BASICO", JSON.stringify(obj || {})); } catch {}
  }, []);
  useEffect(() => {
    // por si algún módulo escribe directo
    try {
      const raw = localStorage.getItem("ICA_PACIENTE_BASICO");
      if (raw) setDatosPaciente(JSON.parse(raw));
    } catch {}
  }, []);

  // ====== Ingreso Personas / Guest ======
  const handleIngresoPersonas = () => setPaso("form");
  const handleGuest = () => {
    const dummy = { nombre: "INVITADO", rut: "11.111.111-1", edad: "", genero: "", dolor: "", lado: "" };
    setDatosPaciente(dummy);
    persistPaciente(dummy);
    setPaso("p2");
  };

  // ====== FormularioPacienteBasico ======
  const onCambiarDato = (campo, valor) => setDatosPaciente((p) => ({ ...p, [campo]: valor }));
  const onSubmitPaciente = () => {
    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = { ...datosPaciente, edad: edadNum, genero: normalizarGenero(datosPaciente.genero) };
    setDatosPaciente(paciente);
    persistPaciente(paciente);
    setPaso("p2");
  };

  // ====== Pago / Simulación (el padre los centraliza) ======
  const validarRequisitosPagoTrauma = useCallback(() => {
    const edadNum = Number(datosPaciente.edad);
    if (!datosPaciente?.nombre?.trim() || !datosPaciente?.rut?.trim()
      || !Number.isFinite(edadNum) || edadNum <= 0 || !datosPaciente?.dolor?.trim()) {
      alert("Complete nombre, RUT, edad (>0) y dolor antes de pagar.");
      return false;
    }
    return true;
  }, [datosPaciente]);

  // intenta endpoint oficial; si no existe, simula
  const crearPagoTrauma = useCallback(async () => {
    // idPago
    const idPago = `trauma_${Date.now()}_${Math.floor(Math.random()*1_000_000)}`;
    try { sessionStorage.setItem("idPago", idPago); } catch {}

    // normaliza payload paciente (compat con backend)
    const edadNum = Number(datosPaciente.edad) || datosPaciente.edad;
    const paciente = {
      ...datosPaciente,
      edad: edadNum,
      genero: normalizarGenero(datosPaciente.genero),
    };

    // POST preferido
    try {
      const r = await fetch(`${BACKEND_BASE}/crear-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago, scope: "trauma", paciente }),
      });
      if (r.ok) {
        const j = await r.json();
        return { idPago, url: j?.url || `${window.location.origin}?pago=ok&idPago=${idPago}` };
      }
    } catch {}
    // Fallback: simular cobro y volver con OK
    return { idPago, url: `${window.location.origin}?pago=ok&idPago=${idPago}` };
  }, [datosPaciente]);

  const onPagarTrauma = useCallback(async () => {
    if (!validarRequisitosPagoTrauma()) return;
    const { url } = await crearPagoTrauma();
    // redirige a pasarela (o a OK simulado)
    window.location.assign(url);
  }, [crearPagoTrauma, validarRequisitosPagoTrauma]);

  const onSimularPagoGuest = useCallback(async () => {
    // guest directo a OK
    const idPago = `guest_${Date.now()}_${Math.floor(Math.random()*1_000_000)}`;
    try { sessionStorage.setItem("idPago", idPago); } catch {}
    const urlOK = `${window.location.origin}?pago=ok&idPago=${idPago}`;
    window.location.assign(urlOK);
  }, []);

  // ====== Auto-navegar a previews si hay preview listo (compat) ======
  useEffect(() => {
    const check = () => {
      try {
        const ia = localStorage.getItem("ICA_PREVIEW_IA");
        const orden = localStorage.getItem("ICA_PREVIEW_ORDEN");
        if ((ia && ia.length) || (orden && orden.length)) setPaso("p3");
      } catch {}
    };
    check();
    const i = setInterval(check, 400);
    const onStorage = (e) => {
      if (e.key === "ICA_PREVIEW_IA" || e.key === "ICA_PREVIEW_ORDEN") check();
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(i); window.removeEventListener("storage", onStorage); };
  }, []);

  // ====== Compat con #previews ======
  useEffect(() => {
    const applyHash = () => { if (window.location.hash === "#previews") setPaso("p3"); };
    applyHash(); window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <div className="app" style={cssVars}>
      {paso === "p1" && (
        <PantallaUno
          onIngresoPersonas={handleIngresoPersonas}
          onContinuar={handleIngresoPersonas}   // compat
          onGuest={handleGuest}
        />
      )}

      {paso === "form" && (
        <div className="card">
          <div className="section">
            <h1 className="h1">Ingreso Personas · Datos básicos</h1>
            <button className="btn secondary nowrap" onClick={() => setPaso("p1")}>Volver</button>
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

      {paso === "p2" && (
        <PantallaDos
          initialDatos={datosPaciente}
          onVolver={() => setPaso("p1")}
          // === Pago/Preview controlados por el padre ===
          onPagarTrauma={onPagarTrauma}
          onSimularPagoGuest={onSimularPagoGuest}
        />
      )}

      {paso === "p3" && (
        <PantallaTres
          datosPaciente={datosPaciente}
          onVolver={() => setPaso("p2")}
        />
      )}
    </div>
  );
}
