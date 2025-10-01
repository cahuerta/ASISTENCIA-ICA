// src/screens/PantallaUno.jsx
"use client";
import React, { useCallback, useRef } from "react";

export default function PantallaUno({ onContinuar, logoSrc = "/assets/ica.jpg" }) {
  const clickedRef = useRef(false);

  const crearSessionGuest = useCallback(() => {
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const authPayload = {
      role: "guest",
      sessionId,
      scopes: ["selector", "ia", "trauma", "generales", "preop", "mapper"],
      createdAt: new Date().toISOString(),
    };
    const codesPayload = { FULL_ACCESS: true, version: 1 };

    try {
      localStorage.setItem("ICA_AUTH", JSON.stringify(authPayload));
      localStorage.setItem("ICA_CODES", JSON.stringify(codesPayload));
    } catch (_) {}
  }, []);

  const handleGuest = useCallback(() => {
    if (clickedRef.current) return;
    clickedRef.current = true;
    crearSessionGuest();
    if (typeof onContinuar === "function") onContinuar();
  }, [crearSessionGuest, onContinuar]);

  return (
    <div className="ica-p1">
      <header className="ica-p1__header">
        <img
          src={logoSrc}
          alt="Instituto de Cirugía Articular"
          className="ica-p1__logo"
          draggable="false"
        />
      </header>

      <main className="ica-p1__main">
        <h1 className="ica-p1__title">Ingreso Personas</h1>
        <p className="ica-p1__subtitle">
          Acceso inicial para evaluación y navegación por los módulos.
        </p>
        {/* (Espacio reservado por si sumas campos luego) */}
      </main>

      <footer className="ica-p1__footer">
        <button
          type="button"
          onClick={handleGuest}
          className="btn btn--guest"
          aria-label="Entrar como invitado"
        >
          Entrar como invitado (Guest)
        </button>
        <div className="ica-p1__note">
          Se creará una sesión <b>guest</b> con permisos para navegar por todo el programa.
        </div>
      </footer>
    </div>
  );
}
