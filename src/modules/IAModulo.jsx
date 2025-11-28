// src/modules/IAModulo.jsx
"use client";
import React, { useState } from "react";
import { getTheme } from "../theme.js";

const T = getTheme();

export default function IAModulo({ datosIniciales = {}, onIrPantallaTres }) {
  // ===========================
  //   1) Estado paciente
  // ===========================
  const [nombre, setNombre] = useState(datosIniciales.nombre || "");
  const [rut, setRut] = useState(datosIniciales.rut || "");
  const [edad, setEdad] = useState(datosIniciales.edad || "");
  const [dolor, setDolor] = useState(datosIniciales.dolor || "");
  const [lado, setLado] = useState(datosIniciales.lado || "");

  // ===========================
  //   2) Estado IA
  // ===========================
  const [texto, setTexto] = useState("");              // texto libre del usuario
  const [loading, setLoading] = useState(false);
  const [resultadoIA, setResultadoIA] = useState("");  // lo que responde IA

  // ===========================
  //   3) Generar idPago unificado (TU PETICIÓN)
  // ===========================
  function ensureIdPago() {
    let id = sessionStorage.getItem("idPago");
    if (id && id.startsWith("ia_")) return id;

    id = "ia_" + Date.now() + "_" + Math.floor(Math.random() * 999999);
    sessionStorage.setItem("idPago", id);
    return id;
  }

  // ===========================
  //   4) Llamar a la IA
  // ===========================
  async function generarInforme() {
    if (!texto.trim()) {
      alert("Describe los síntomas para generar el informe.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        sintomas: texto,
        nombre,
        rut,
        edad,
        dolor,
        lado,
      };

      // *** Aquí llamas a tu backend real de IA ***
      const r = await fetch("https://asistencia-ica-backend.onrender.com/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        alert("No se pudo generar el informe IA.");
        setLoading(false);
        return;
      }

      const textoIA = j.informe || "";
      setResultadoIA(textoIA);

      // *** GUARDAR en sessionStorage (TU PETICIÓN) ***
      const idPago = ensureIdPago();

      sessionStorage.setItem("modulo", "ia");
      sessionStorage.setItem("idPago", idPago);
      sessionStorage.setItem("previewIA", textoIA);
      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({ nombre, rut, edad, dolor, lado })
      );

      setLoading(false);

      // *** IR A PANTALLA TRES (TU PETICIÓN) ***
      if (typeof onIrPantallaTres === "function") {
        onIrPantallaTres({
          nombre,
          rut,
          edad,
          dolor,
          lado,
          idPago,
        });
      }
    } catch (e) {
      console.error(e);
      alert("Error generando informe IA.");
      setLoading(false);
    }
  }

  // ===========================
  //   RENDER SIMPLE Y ORIGINAL
  // ===========================
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Describe los síntomas para generar el informe.</h2>

      <textarea
        rows={8}
        placeholder="Ej: Dolor en rodilla derecha desde hace 3 semanas..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 10,
          border: "1px solid #ccc",
          resize: "vertical",
          fontSize: 15,
        }}
      />

      <button
        onClick={generarInforme}
        disabled={loading}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: T.primary,
          color: "#fff",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {loading ? "Generando..." : "Generar Informe"}
      </button>

      {resultadoIA && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 10,
            background: "#f9f9f9",
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}
        >
          {resultadoIA}
        </div>
      )}
    </div>
  );
}
