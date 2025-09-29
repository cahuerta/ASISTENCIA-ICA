// src/FormularioPacienteBasico.jsx
"use client";
import React, { useState } from "react";

/* ====== Utilidades RUT (mismas reglas, simplificadas) ====== */
function limpiarRut(str = "") {
  return String(str).replace(/[^0-9kK]/g, "").toUpperCase();
}
function partirRut(limpio) {
  const s = limpiarRut(limpio);
  if (!s) return { cuerpo: "", dv: undefined };
  if (s.length <= 1) return { cuerpo: s, dv: undefined };
  const cuerpo = s.slice(0, -1);
  const dv = s.slice(-1);
  return { cuerpo, dv };
}
function calcularDV(cuerpo = "") {
  let suma = 0, multa = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multa;
    multa = multa === 7 ? 2 : multa + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}
function formatearRut(cuerpo = "", dv) {
  if (!cuerpo) return "";
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${cuerpoFmt}-${dv}` : cuerpoFmt;
}
function validarRut(str = "") {
  const s = limpiarRut(str);
  if (s.length < 2) return { valido: false, motivo: "incompleto" };
  const { cuerpo, dv } = partirRut(s);
  if (!/^\d{1,8}$/.test(cuerpo)) return { valido: false, motivo: "cuerpo inválido" };
  const dvOk = calcularDV(cuerpo);
  const valido = dv === dvOk;
  return { valido, motivo: valido ? "" : `DV incorrecto, debería ser ${dvOk}` };
}

/**
 * Formulario básico para la pantalla inicial.
 * Solo recoge: Nombre, RUT (con DV), Edad, Género.
 * No muestra Dolor/Lado ni Tipo de cirugía.
 *
 * Props:
 *  - datos: { nombre, rut, edad, genero, ... }
 *  - onCambiarDato(campo, valor)
 *  - onSubmit(e)  -> el padre decide “paso a menú”
 */
function FormularioPacienteBasico({ datos, onCambiarDato, onSubmit }) {
  const [rutMsg, setRutMsg] = useState("");
  const [rutValido, setRutValido] = useState(true);

  // RUT en vivo
  const handleRutChange = (e) => {
    let s = limpiarRut(e.target.value);
    if (s.length > 9) s = s.slice(0, 9);

    const { cuerpo, dv } = partirRut(s);
    if (cuerpo && cuerpo.length >= 7) {
      const dvCalc = calcularDV(cuerpo);
      if (dv) {
        if (dv !== dvCalc) {
          setRutValido(false);
          setRutMsg(`DV esperado: ${dvCalc}. Se corregirá al salir del campo.`);
        } else {
          setRutValido(true);
          setRutMsg("RUT válido.");
        }
      } else {
        setRutValido(false);
        setRutMsg(`DV sugerido: ${dvCalc}`);
      }
    } else {
      setRutValido(true);
      setRutMsg("");
    }
    onCambiarDato("rut", s);
  };

  const handleRutBlur = () => {
    const s = limpiarRut(datos?.rut || "");
    if (!s) {
      setRutValido(false);
      setRutMsg("Ingrese un RUT.");
      return;
    }
    const { cuerpo } = partirRut(s);
    if (!/^\d{1,8}$/.test(cuerpo)) {
      setRutValido(false);
      setRutMsg("RUT incompleto.");
      return;
    }
    const dvCalc = calcularDV(cuerpo);
    const rutFormateado = formatearRut(cuerpo, dvCalc);
    onCambiarDato("rut", rutFormateado);
    setRutValido(true);
    setRutMsg("RUT formateado.");
  };

  const handleSubmit = (e) => {
    // Validación suave: dejamos que el flujo “Guest” pase igual,
    // la validación “dura” la hará el padre según sea demo o real.
    const v = validarRut(datos?.rut || "");
    if (!v.valido) {
      e.preventDefault();
      setRutValido(false);
      setRutMsg(v.motivo ? `RUT inválido: ${v.motivo}.` : "RUT inválido.");
      return;
    }
    onSubmit?.(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="h1 center mb-12">Asistente Virtual — Datos Iniciales</h1>

      <label>Nombre completo:</label>
      <input
        type="text"
        value={datos.nombre || ""}
        onChange={(e) => onCambiarDato("nombre", e.target.value)}
        required
      />

      <label>RUT:</label>
      <input
        type="text"
        value={datos.rut || ""}
        onChange={handleRutChange}
        onBlur={handleRutBlur}
        placeholder="12.345.678-9"
        inputMode="text"
        autoComplete="off"
        required
        aria-invalid={!rutValido}
        aria-describedby="rut-help-basic"
        className={rutValido ? "" : "input-error"}
      />
      <div
        id="rut-help-basic"
        style={{
          fontSize: 12,
          marginTop: 4,
          minHeight: 16,
          color: rutValido ? "var(--text-muted)" : "var(--primary-dark)",
        }}
      >
        {rutMsg}
      </div>

      <label>Edad:</label>
      <input
        type="number"
        min="10"
        max="110"
        value={datos.edad ?? ""}
        onChange={(e) => onCambiarDato("edad", e.target.value)}
        required
      />

      <label>Género:</label>
      <select
        value={datos.genero || ""}
        onChange={(e) => onCambiarDato("genero", e.target.value)}
        required
      >
        <option value="">Seleccione…</option>
        <option value="MASCULINO">MASCULINO</option>
        <option value="FEMENINO">FEMENINO</option>
      </select>

      <button className="btn fullw mt-16" type="submit">
        Continuar
      </button>
    </form>
  );
}

export default FormularioPacienteBasico;
