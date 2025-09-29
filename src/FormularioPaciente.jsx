// src/FormularioPaciente.jsx
"use client";
import React, { useMemo, useState, useEffect } from "react";

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

/* ============ Tipos de cirugía (filtrados por zona) ============ */
function cirugiasParaZona(dolor = "") {
  const s = (dolor || "").toLowerCase();
  if (s.includes("cadera")) {
    return [
      "ARTROPLASTIA TOTAL DE CADERA (ATC)",
      "ARTROSCOPIA DE CADERA",
      "OSTEOTOMÍA DE CADERA",
      "CIRUGÍA MENOR DE PARTES BLANDAS",
      "OTRO (ESPECIFICAR)",
    ];
  }
  if (s.includes("rodilla")) {
    return [
      "ARTROPLASTIA TOTAL DE RODILLA (ATR)",
      "ARTROSCOPIA DE RODILLA",
      "OSTEOTOMÍA DE RODILLA",
      "CIRUGÍA MENOR DE PARTES BLANDAS",
      "OTRO (ESPECIFICAR)",
    ];
  }
  return [];
}

function FormularioPaciente({ datos, onCambiarDato, onSubmit, moduloActual = "trauma" }) {
  const [rutMsg, setRutMsg] = useState("");
  const [rutValido, setRutValido] = useState(true);

  // === Mostrar "Tipo de cirugía" SOLO en PREOP
  const isPreop =
    moduloActual === "preop" ||
    (typeof window !== "undefined" && sessionStorage.getItem("modulo") === "preop");

  // === En GENERALES no se piden Dolor ni Lado
  const isGenerales =
    moduloActual === "generales" ||
    (typeof window !== "undefined" && sessionStorage.getItem("modulo") === "generales");

  // Tipo de cirugía (persistido)
  const [tipoCirugia, setTipoCirugia] = useState(() => {
    try {
      return sessionStorage.getItem("preop_tipoCirugia") || "";
    } catch {
      return "";
    }
  });
  const [tipoCirugiaLibre, setTipoCirugiaLibre] = useState(() => {
    try {
      return sessionStorage.getItem("preop_tipoCirugia_otro") || "";
    } catch {
      return "";
    }
  });

  const opcionesCirugia = useMemo(
    () => cirugiasParaZona(datos?.dolor || ""),
    [datos?.dolor]
  );

  useEffect(() => {
    if (!opcionesCirugia.length) return;
    const valido =
      tipoCirugia === "" ||
      tipoCirugia === "OTRO (ESPECIFICAR)" ||
      opcionesCirugia.includes(tipoCirugia);
    if (!valido) setTipoCirugia("");
  }, [opcionesCirugia, tipoCirugia]);

  useEffect(() => {
    try {
      sessionStorage.setItem("preop_tipoCirugia", tipoCirugia || "");
    } catch {}
  }, [tipoCirugia]);
  useEffect(() => {
    try {
      sessionStorage.setItem("preop_tipoCirugia_otro", tipoCirugiaLibre || "");
    } catch {}
  }, [tipoCirugiaLibre]);

  /* ======= RUT en vivo ======= */
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

  /* ======= Submit (valida RUT y, si PREOP, exige tipo de cirugía) ======= */
  const handleSubmit = (e) => {
    const v = validarRut(datos?.rut || "");
    if (!v.valido) {
      e.preventDefault();
      setRutValido(false);
      setRutMsg(v.motivo ? `RUT inválido: ${v.motivo}.` : "RUT inválido.");
      return;
    }

    if (isPreop) {
      if (!tipoCirugia) {
        e.preventDefault();
        alert("Seleccione el TIPO DE CIRUGÍA.");
        return;
      }
      if (tipoCirugia === "OTRO (ESPECIFICAR)" && !tipoCirugiaLibre.trim()) {
        e.preventDefault();
        alert("Especifique el tipo de cirugía en el campo 'Otro'.");
        return;
      }
    }

    onSubmit(e);
  };

  // === Lado no aplica en zonas de columna ===
  const isZonaColumna = useMemo(() => {
    const d = (datos?.dolor || "").toLowerCase();
    return d.includes("columna");
  }, [datos?.dolor]);

  const manejoCambioDolor = (e) => {
    const v = e.target.value;
    onCambiarDato("dolor", v);
    if (v.toLowerCase().includes("columna")) {
      // borrar lado si la zona no tiene lateralidad
      onCambiarDato("lado", "");
    }
  };

  const showCirugia = isPreop;
  const listaOpciones =
    opcionesCirugia.length > 0 ? opcionesCirugia : ["OTRO (ESPECIFICAR)"];

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="h1 center mb-12">Asistente Virtual para Pacientes</h1>

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
        aria-describedby="rut-help"
        className={rutValido ? "" : "input-error"}
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
        {/* Valores COMPATIBLES con tu app: MASCULINO / FEMENINO */}
        <option value="MASCULINO">MASCULINO</option>
        <option value="FEMENINO">FEMENINO</option>
      </select>

      {/* Dolor/Lado: se ocultan en GENERALES */}
      {!isGenerales && (
        <>
          <label>Dolor:</label>
          <select
            value={datos.dolor || ""}
            onChange={manejoCambioDolor}
            required
          >
            <option value="">Seleccione...</option>
            {/* existentes */}
            <option value="Rodilla">Rodilla</option>
            <option value="Cadera">Cadera</option>
            <option value="Columna lumbar">Columna lumbar</option>
            {/* nuevos de columna SIN lado */}
            <option value="Columna cervical">Columna cervical</option>
            <option value="Columna dorsal">Columna dorsal</option>
            {/* nuevos puntos agregados al esquema */}
            <option value="Hombro">Hombro</option>
            <option value="Codo">Codo</option>
            <option value="Mano">Mano</option>
            <option value="Tobillo">Tobillo</option>
          </select>

          <label>Lado:</label>
          <select
            value={datos.lado || ""}
            onChange={(e) => onCambiarDato("lado", e.target.value)}
            required={!isZonaColumna}
            disabled={isZonaColumna}
          >
            {isZonaColumna ? (
              <option value="">No aplica</option>
            ) : (
              <>
                <option value="">Seleccione...</option>
                <option value="Derecha">Derecha</option>
                <option value="Izquierda">Izquierda</option>
              </>
            )}
          </select>
        </>
      )}

      {/* TIPO DE CIRUGÍA (solo en PREOP) */}
      {showCirugia && (
        <>
          <label>TIPO DE CIRUGÍA:</label>
          <select
            value={tipoCirugia}
            onChange={(e) => setTipoCirugia(e.target.value)}
            required
          >
            <option value="">Seleccione…</option>
            {listaOpciones.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {tipoCirugia === "OTRO (ESPECIFICAR)" && (
            <input
              placeholder="Especifique el tipo de cirugía"
              value={tipoCirugiaLibre}
              onChange={(e) => setTipoCirugiaLibre(e.target.value)}
              required
            />
          )}
        </>
      )}

      <button className="btn fullw mt-16" type="submit">
        Generar Informe
      </button>
    </form>
  );
}

export default FormularioPaciente;
