// src/screens/PantallaTres.jsx
"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";

/**
 * Pantalla 3 — Previsualización y Descargas
 * ✅ SIN inventar nombres: usa las MISMAS props/datos si vienen desde tus módulos/App antiguo.
 * ✅ Si alguna prop no llega, intenta leer lo mismo desde localStorage (compat: ICA_*).
 *
 * Props (todas opcionales, se usan si existen):
 * - datosPaciente           : object
 * - previewIA               : string (texto/HTML)
 * - previewOrden            : string | object (lo que ya genere tu módulo)
 * - onRegenerarIA           : () => void
 * - onRegenerarOrden        : () => void
 * - onDescargarFicha        : () => void
 * - onDescargarReceta       : () => void
 * - onDescargarOrden        : () => void
 * - onVolver                : () => void
 */
export default function PantallaTres(props) {
  // ======== Compatibilidad: usa props si llegan; si no, carga lo guardado ========
  const [paciente, setPaciente] = useState(() => {
    if (props.datosPaciente) return props.datosPaciente;
    try {
      const s = localStorage.getItem("ICA_PACIENTE_BASICO");
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const [ia, setIA] = useState(() => {
    if (props.previewIA) return props.previewIA;
    try {
      const s = localStorage.getItem("ICA_PREVIEW_IA");
      return s || "";
    } catch {
      return "";
    }
  });

  const [orden, setOrden] = useState(() => {
    if (props.previewOrden) return props.previewOrden;
    try {
      const s = localStorage.getItem("ICA_PREVIEW_ORDEN");
      return s ? JSON.parse(s) : "";
    } catch {
      return "";
    }
  });

  // Sync si cambian las props (no renombra nada)
  useEffect(() => {
    if (props.datosPaciente) setPaciente(props.datosPaciente);
  }, [props.datosPaciente]);

  useEffect(() => {
    if (typeof props.previewIA !== "undefined") setIA(props.previewIA || "");
  }, [props.previewIA]);

  useEffect(() => {
    if (typeof props.previewOrden !== "undefined") setOrden(props.previewOrden || "");
  }, [props.previewOrden]);

  // Persistencia mínima (no rompe si no existe localStorage)
  useEffect(() => {
    try { localStorage.setItem("ICA_PACIENTE_BASICO", JSON.stringify(paciente)); } catch {}
  }, [paciente]);
  useEffect(() => {
    try { localStorage.setItem("ICA_PREVIEW_IA", ia || ""); } catch {}
  }, [ia]);
  useEffect(() => {
    try { localStorage.setItem("ICA_PREVIEW_ORDEN", JSON.stringify(orden ?? "")); } catch {}
  }, [orden]);

  // Helpers: muestran botón solo si existe handler
  const Btn = useCallback(({ label, onClick, kind = "primary" }) => {
    if (typeof onClick !== "function") {
      return (
        <button className={`btn ${kind === "secondary" ? "secondary" : ""} fullw`} disabled>
          {label}
        </button>
      );
    }
    return (
      <button className={`btn ${kind === "secondary" ? "secondary" : ""} fullw`} onClick={onClick}>
        {label}
      </button>
    );
  }, []);

  // Render orden como texto legible si vino objeto
  const ordenTexto = useMemo(() => {
    if (!orden) return "";
    if (typeof orden === "string") return orden;
    // Si es objeto, concatenamos sin inventar claves nuevas
    const parts = [];
    if (orden.tipo) parts.push(`Tipo: ${orden.tipo}`);
    if (orden.zona) parts.push(`Zona: ${orden.zona}`);
    if (orden.lado) parts.push(`Lado: ${orden.lado}`);
    if (orden.indicacion) parts.push(`Indicación: ${orden.indicacion}`);
    if (orden.detalle) parts.push(String(orden.detalle));
    return parts.join("\n");
  }, [orden]);

  return (
    <div className="app">
      <div className="card">
        <div className="section">
          <h1 className="h1">Previsualización y descargas</h1>
          {typeof props.onVolver === "function" && (
            <button className="btn secondary nowrap" onClick={props.onVolver}>
              Volver
            </button>
          )}
        </div>

        <div className="divider" />

        {/* Resumen mínimo del paciente (si existe) */}
        {(paciente?.nombre || paciente?.rut) && (
          <div className="chips mt-8">
            {paciente?.nombre ? <span className="chip">Nombre: {paciente.nombre}</span> : null}
            {paciente?.rut ? <span className="chip">RUT: {paciente.rut}</span> : null}
            {paciente?.edad ? <span className="chip">Edad: {paciente.edad}</span> : null}
            {paciente?.genero ? <span className="chip">Género: {paciente.genero}</span> : null}
          </div>
        )}

        {/* Grid de previews */}
        <div className="grid-autofit mt-16">
          {/* ======= PREVIEW IA ======= */}
          <div className="card">
            <h3 className="h1" style={{ fontSize: "1.05rem" }}>Preview IA</h3>
            <div className="trauma-mono mt-8" style={{ minHeight: 160 }}>
              {ia ? ia : "— Sin contenido IA —"}
            </div>

            <div className="toolbar mt-12">
              <Btn label="Regenerar IA" onClick={props.onRegenerarIA} />
              <Btn label="Descargar ficha" onClick={props.onDescargarFicha} kind="secondary" />
              <Btn label="Descargar receta" onClick={props.onDescargarReceta} kind="secondary" />
            </div>
          </div>

          {/* ======= PREVIEW ORDEN ======= */}
          <div className="card">
            <h3 className="h1" style={{ fontSize: "1.05rem" }}>Preview Orden</h3>
            <div className="trauma-mono mt-8" style={{ minHeight: 160, whiteSpace: "pre-wrap" }}>
              {ordenTexto ? ordenTexto : "— Sin contenido de orden —"}
            </div>

            <div className="toolbar mt-12">
              <Btn label="Regenerar orden" onClick={props.onRegenerarOrden} />
              <Btn label="Descargar orden" onClick={props.onDescargarOrden} kind="secondary" />
            </div>
          </div>
        </div>

        {/* Nota mínima */}
        <p className="muted mt-16">Si un botón aparece deshabilitado, ese handler no fue pasado por props.</p>
      </div>
    </div>
  );
}
