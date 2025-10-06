// src/FormularioPacienteBasico.jsx
"use client";
import React, { useState, useEffect } from "react";

/* ================= Utilidades RUT (Chile) ================= */
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

/* ================== Guest detection (solo nombre+rut) ================== */
const GUEST_NOMBRE = "Guest";
const GUEST_RUT = "11.111.111-1";
function normRut(str){ return String(str||"").replace(/[^0-9kK]/g,"").toUpperCase(); }
function isGuestPair(nombre, rut){
  return String(nombre||"").trim().toLowerCase() === GUEST_NOMBRE
      && normRut(rut) === normRut(GUEST_RUT);
}

/* ================= Formulario básico (autónomo si no recibe props) ================= */
function FormularioPacienteBasico({
  datos,
  onCambiarDato,
  onSubmit,
  modoInvitado = false,   // si es true, no valida RUT estrictamente ni exige campos
  initialValues = null,   // ← NUEVO: precarga opcional (usado por PantallaUno)
}) {
  // MODO AUTÓNOMO: si no me pasan datos/onCambiarDato, uso estado interno
  const isManaged = typeof onCambiarDato === "function" && datos && typeof datos === "object";
  const [localDatos, setLocalDatos] = useState(() => ({
    // Solo sembramos nombre y rut desde initialValues; edad y genero quedan vacíos
    nombre: initialValues?.nombre ?? "",
    rut: initialValues?.rut ?? "",
    edad: "",
    genero: "",
  }));

  // Acceso unificado a valores actuales
  const curr = isManaged ? datos : localDatos;

  // Setter unificado (actualiza padre si existe; si no, estado interno)
  const setCampo = (campo, valor) => {
    if (isManaged) {
      onCambiarDato(campo, valor);
    } else {
      setLocalDatos((prev) => ({ ...prev, [campo]: valor }));
    }
  };

  const [rutMsg, setRutMsg] = useState("");
  const [rutValido, setRutValido] = useState(true);

  // Bloqueo de Nombre/RUT cuando detectamos perfil guest real (nombre+rut)
  const [bloquearNombreRut, setBloquearNombreRut] = useState(() =>
    isGuestPair(curr?.nombre, curr?.rut)
  );

  useEffect(() => {
    setBloquearNombreRut(isGuestPair(curr?.nombre, curr?.rut));
  }, [curr?.nombre, curr?.rut]);

  /* ======= RUT en vivo ======= */
  const handleRutChange = (e) => {
    if (bloquearNombreRut) return;

    if (modoInvitado) {
      setCampo("rut", e.target.value);
      setRutValido(true);
      setRutMsg("");
      return;
    }

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
    setCampo("rut", s);
  };

  const handleRutBlur = () => {
    if (bloquearNombreRut) return;
    if (modoInvitado) return;

    const s = limpiarRut(curr?.rut || "");
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
    setCampo("rut", rutFormateado);
    setRutValido(true);
    setRutMsg("RUT formateado.");
  };

  /* ======= Submit ======= */
  const handleSubmit = (e) => {
    // Validaciones cuando NO es invitado y NO está bloqueado (guest real)
    if (!modoInvitado && !bloquearNombreRut) {
      const v = validarRut(curr?.rut || "");
      if (!v.valido) {
        e.preventDefault();
        setRutValido(false);
        setRutMsg(v.motivo ? `RUT inválido: ${v.motivo}.` : "RUT inválido.");
        return;
      }
      const edadNum = Number(curr?.edad);
      if (!Number.isFinite(edadNum) || edadNum < 18 || edadNum > 110) {
        e.preventDefault();
        alert("Edad fuera de rango (debe ser entre 18 y 110).");
        return;
      }
    }

    // Siempre persistimos para el flujo global
    try {
      sessionStorage.setItem(
        "datosPacienteJSON",
        JSON.stringify({
          nombre: String(curr?.nombre ?? "").trim(),
          rut: String(curr?.rut ?? "").trim(),
          edad: String(curr?.edad ?? "").trim(),
          genero: String(curr?.genero ?? "").trim(),
        })
      );
    } catch {}

    // Si el padre pasó onSubmit, se respeta; si no, prevenimos el submit real (no recargar página)
    if (typeof onSubmit === "function") {
      onSubmit(e);
    } else {
      e.preventDefault();
    }
  };

  // Helper para required (en invitado no exigimos)
  const req = (v) => (modoInvitado ? undefined : v);

  return (
    <form onSubmit={handleSubmit} noValidate={modoInvitado}>
      <h1 className="h1 center mb-12">Asistente Virtual para Pacientes</h1>

      <label>Nombre completo:</label>
      <input
        type="text"
        value={String(curr?.nombre ?? "")}
        onChange={(e) => setCampo("nombre", e.target.value)}
        required={req(true)}
        autoComplete="name"
        autoCapitalize="words"
        readOnly={bloquearNombreRut}
      />

      <label>RUT:</label>
      <input
        type="text"
        value={String(curr?.rut ?? "")}
        onChange={handleRutChange}
        onBlur={handleRutBlur}
        placeholder="12.345.678-9"
        inputMode="text"
        autoComplete="off"
        required={req(true)}
        aria-invalid={!rutValido}
        aria-describedby="rut-help"
        className={rutValido ? "" : "input-error"}
        readOnly={bloquearNombreRut}
      />
      <div
        id="rut-help"
        style={{
          fontSize: 12,
          marginTop: 4,
          minHeight: 16,
          color: rutValido ? "var(--text-muted)" : "var(--primary-dark)",
        }}
      >
        {bloquearNombreRut ? "" : (modoInvitado ? "" : rutMsg)}
      </div>

      <label>Edad:</label>
      <input
        type="number"
        min={modoInvitado ? undefined : 18}
        max={modoInvitado ? undefined : 110}
        value={String(curr?.edad ?? "")}
        onChange={(e) => setCampo("edad", e.target.value)}
        required={req(true)}
        inputMode="numeric"
      />

      <label>Sexo:</label>
      <select
        value={String(curr?.genero ?? "")}
        onChange={(e) => setCampo("genero", e.target.value)}
        required={req(true)}
      >
        <option value="">{modoInvitado ? "Opcional…" : "Seleccione…"}</option>
        {/* Valores compatibles con el resto de la app */}
        <option value="Masculino">Masculino</option>
        <option value="Femenino">Femenino</option>
      </select>

      <button className="btn fullw mt-16" type="submit">
        {modoInvitado ? "Continuar (modo invitado)" : "Continuar"}
      </button>
    </form>
  );
}

export default FormularioPacienteBasico;
