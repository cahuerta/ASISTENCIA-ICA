"use client";
import React, { useMemo, useState, useEffect } from "react";
import { getTheme } from "../theme.js"; // colores desde theme.json
const T = getTheme();

/* ===== Utilidades RUT (Chile) ===== */
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

/* ===== Catálogo de tipos de cirugía para PREOP ===== */
const TIPOS_CIRUGIA = [
  "Artroplastia total de cadera (ATC)",
  "Artroplastia total de rodilla (ATR)",
  "Artroscopia de rodilla",
  "Osteotomía (cadera/rodilla)",
  "Cirugía menor de partes blandas",
  "Otro (especificar)",
];

function FormularioPaciente({ datos, onCambiarDato, onSubmit }) {
  const [rutMsg, setRutMsg] = useState("");
  const [rutValido, setRutValido] = useState(true);

  // PREOP: leo el módulo actual directamente de sessionStorage en cada render
  const isPreop = (() => {
    try { return sessionStorage.getItem("modulo") === "preop"; } catch { return false; }
  })();

  // Campos extra para PREOP: tipo de cirugía
  const [tipoCirugia, setTipoCirugia] = useState("");
  const [tipoCirugiaLibre, setTipoCirugiaLibre] = useState("");

  // Inicializar desde sessionStorage o desde props si existe
  useEffect(() => {
    try {
      const t = sessionStorage.getItem("preop_tipoCirugia") || datos?.tipoCirugia || "";
      const o = sessionStorage.getItem("preop_tipoCirugia_otro") || "";
      setTipoCirugia(t.startsWith("Otro") && !o ? "Otro (especificar)" : t);
      setTipoCirugiaLibre(o);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar preferencia del usuario y sincronizar con el padre
  useEffect(() => {
    try {
      sessionStorage.setItem("preop_tipoCirugia", tipoCirugia || "");
      sessionStorage.setItem("preop_tipoCirugia_otro", tipoCirugiaLibre || "");
    } catch {}
  }, [tipoCirugia, tipoCirugiaLibre]);

  // Mostrar bloque cirugías solo si: PREOP + dolor rodilla/cadera
  const dolorLower = String(datos?.dolor || "").toLowerCase();
  const showCirugia = isPreop && (dolorLower.includes("rodilla") || dolorLower.includes("cadera"));

  // Empujar el valor final al padre (para backend)
  useEffect(() => {
    const finalTipo =
      showCirugia
        ? (tipoCirugia?.startsWith("Otro") ? (tipoCirugiaLibre || "").trim() : (tipoCirugia || "").trim())
        : "";

    onCambiarDato("tipoCirugia", finalTipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCirugia, tipoCirugia, tipoCirugiaLibre]);

  // Lógicas RUT
  const rutLimpio = useMemo(() => limpiarRut(datos?.rut || ""), [datos?.rut]);

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

  // Validación adicional para PREOP
  const handleSubmit = (e) => {
    // Valida RUT primero
    const v = validarRut(datos?.rut || "");
    if (!v.valido) {
      e.preventDefault();
      setRutValido(false);
      setRutMsg(v.motivo ? `RUT inválido: ${v.motivo}.` : "RUT inválido.");
      return;
    }

    // Si estamos en PREOP y Dolor es Rodilla/Cadera, exigir tipo de cirugía
    if (showCirugia) {
      const finalTipo =
        tipoCirugia?.startsWith("Otro") ? (tipoCirugiaLibre || "").trim() : (tipoCirugia || "").trim();
      if (!finalTipo) {
        e.preventDefault();
        alert("Seleccione o especifique el tipo de cirugía.");
        return;
      }
    }

    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>Asistente Virtual para Pacientes</h1>

      <label style={styles.label}>Nombre completo:</label>
      <input
        style={styles.input}
        type="text"
        value={datos.nombre}
        onChange={(e) => onCambiarDato("nombre", e.target.value)}
        required
      />

      <label style={styles.label}>RUT:</label>
      <input
        style={{
          ...styles.input,
          borderColor: rutValido ? T.border : T.primaryDark,
          outline: rutValido ? "none" : `1px solid ${T.primaryDark}`,
        }}
        type="text"
        value={datos.rut}
        onChange={handleRutChange}
        onBlur={handleRutBlur}
        placeholder="12.345.678-9"
        inputMode="text"
        autoComplete="off"
        required
        aria-invalid={!rutValido}
        aria-describedby="rut-help"
      />
      <div id="rut-help" style={{ ...styles.help, color: rutValido ? T.textMuted : T.primaryDark }}>
        {rutMsg}
      </div>

      <label style={styles.label}>Edad:</label>
      <input
        style={styles.input}
        type="number"
        min="10"
        max="110"
        value={datos.edad}
        onChange={(e) => onCambiarDato("edad", e.target.value)}
        required
      />

      {/* Género (opcional) */}
      <label style={styles.label}>Género:</label>
      <select
        style={styles.input}
        value={datos.genero || ""}
        onChange={(e) => onCambiarDato("genero", e.target.value)}
      >
        <option value="">Seleccione…</option>
        <option value="MASCULINO">MASCULINO</option>
        <option value="FEMENINO">FEMENINO</option>
      </select>

      {/* Dolor siempre */}
      <label style={styles.label}>Dolor:</label>
      <select
        style={styles.input}
        value={datos.dolor}
        onChange={(e) => onCambiarDato("dolor", e.target.value)}
        required
      >
        <option value="">Seleccione...</option>
        <option value="Rodilla">Rodilla</option>
        <option value="Cadera">Cadera</option>
        <option value="Columna lumbar">Columna lumbar</option>
      </select>

      {/* Bloque PREOP: Tipo de cirugía (solo si corresponde) */}
      {showCirugia && (
        <>
          <label style={styles.label}>Tipo de cirugía:</label>
          <select
            style={styles.input}
            value={tipoCirugia}
            onChange={(e) => setTipoCirugia(e.target.value)}
          >
            <option value="">Seleccione…</option>
            {TIPOS_CIRUGIA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {tipoCirugia.startsWith("Otro") && (
            <input
              style={styles.input}
              placeholder="Especifique el tipo de cirugía"
              value={tipoCirugiaLibre}
              onChange={(e) => setTipoCirugiaLibre(e.target.value)}
            />
          )}
        </>
      )}

      <label style={styles.label}>Lado:</label>
      <select
        style={styles.input}
        value={datos.lado}
        onChange={(e) => onCambiarDato("lado", e.target.value)}
        required
      >
        <option value="">Seleccione...</option>
        <option value="Derecha">Derecha</option>
        <option value="Izquierda">Izquierda</option>
      </select>

      <button style={styles.button} type="submit">
        Generar Informe
      </button>
    </form>
  );
}

/* ================= Estilos (100% desde theme.json) ================= */
const styles = {
  form: {
    backgroundColor: T.surface,
    padding: "30px 40px",
    borderRadius: "10px",
    boxShadow: T.shadowMd,
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${T.border}`,
  },
  title: {
    marginBottom: "20px",
    color: T.primary,
    textAlign: "center",
  },
  label: {
    display: "block",
    marginTop: "15px",
    fontWeight: "bold",
    color: T.text,
    textAlign: "left",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    marginTop: "5px",
    border: `1px solid ${T.border}`,
    borderRadius: "5px",
    boxSizing: "border-box",
    fontSize: "14px",
    background: T.surface,
    color: T.text,
  },
  help: {
    fontSize: 12,
    marginTop: 4,
    minHeight: 16,
  },
  button: {
    marginTop: "25px",
    backgroundColor: T.primary,
    color: T.onPrimary || "#fff",
    border: "none",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    transition: "background 0.3s ease",
    boxShadow: T.shadowSm,
  },
};

export default FormularioPaciente;
