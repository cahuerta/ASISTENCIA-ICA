// src/screens/PantallaUno.jsx
"use client";
import React from "react";
import logoICA from "../assets/ica.jpg"; // usa el archivo que ya está en tu repo

export default function PantallaUno({
  onIngresoPersonas,   // preferido
  onContinuar,         // compat antiguo
  onGuest,
  logoSrc,             // opcional; si no viene, se usa el import
}) {
  const goIngreso = onIngresoPersonas || onContinuar;
  const logo = logoSrc || logoICA;

  return (
    <div className="app">
      <div className="card center" style={{ flexDirection: "column", gap: 12 }}>
        <img
          src={logo}
          alt="Instituto de Cirugía Articular"
          className="img-fluid"
          style={{ maxWidth: 220 }}
        />

        <h1 className="h1">Ingreso Personas</h1>

        <div className="toolbar center mt-12">
          {goIngreso && (
            <button className="btn" onClick={goIngreso}>
              Ingreso Personas
            </button>
          )}
          {onGuest && (
            <button className="btn secondary" onClick={onGuest}>
              Entrar como invitado (Guest)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
