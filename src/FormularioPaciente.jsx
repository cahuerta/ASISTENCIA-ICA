"use client";
import React, { useMemo, useState } from "react";
import { getTheme } from "./theme.js"; // colores desde theme.json
const T = getTheme();

/* ===== Utilidades RUT (Chile) ===== */
function limpiarRut(str = "") { return String(str).replace(/[^0-9kK]/g, "").toUpperCase(); }
function partirRut(limpio) { const s = limpiarRut(limpio); if (!s) return { cuerpo:"", dv:undefined }; if (s.length<=1) return { cuerpo:s, dv:undefined }; return { cuerpo:s.slice(0,-1), dv:s.slice(-1) }; }
function calcularDV(cuerpo = "") { let suma=0,m=2; for (let i=cuerpo.length-1;i>=0;i--){ suma+=Number(cuerpo[i])*m; m=m===7?2:m+1; } const r=11-(suma%11); if (r===11) return "0"; if (r===10) return "K"; return String(r); }
function formatearRut(cuerpo="", dv){ if(!cuerpo) return ""; const c=cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g,"."); return dv?`${c}-${dv}`:c; }
function validarRut(str=""){ const s=limpiarRut(str); if(s.length<2) return {valido:false, motivo:"incompleto"}; const {cuerpo,dv}=partirRut(s); if(!/^\d{1,8}$/.test(cuerpo)) return {valido:false, motivo:"cuerpo inválido"}; const dvOk=calcularDV(cuerpo); return {valido: dv===dvOk, motivo: dv===dvOk? "":`DV incorrecto, debería ser ${dvOk}`}; }

/* ===== Catálogo de tipos de cirugía para PREOP ===== */
const TIPOS_CIRUGIA = [
  "Artroplastia total de cadera (ATC)",
  "Artroplastia total de rodilla (ATR)",
  "Artroscopia de rodilla",
  "Osteotomía (cadera/rodilla)",
  "Cirugía menor de partes blandas",
  "Otro (especificar)",
];

function FormularioPaciente({ datos, onCambiarDato, onSubmit, moduloActual }) {
  const [rutMsg, setRutMsg] = useState("");
  const [rutValido, setRutValido] = useState(true);

  // 👉 ahora viene por prop y React re-renderiza al cambiar el módulo
  const isPreop = moduloActual === "preop";

  // Campos extra para PREOP: tipo de cirugía (persisten en sessionStorage)
  const [tipoCirugia, setTipoCirugia] = useState(() => {
    try { return sessionStorage.getItem("preop_tipoCirugia") || ""; } catch { return ""; }
  });
  const [tipoCirugiaLibre, setTipoCirugiaLibre] = useState(() => {
    try { return sessionStorage.getItem("preop_tipoCirugia_otro") || ""; } catch { return ""; }
  });

  const guardarCirugia = (sel, libre) => {
    try {
      sessionStorage.setItem("preop_tipoCirugia", sel || "");
      sessionStorage.setItem("preop_tipoCirugia_otro", libre || "");
    } catch {}
  };

  // Lógicas RUT
  const rutLimpio = useMemo(() => limpiarRut(datos?.rut || ""), [datos?.rut]);

  const handleRutChange = (e) => {
    let s = limpiarRut(e.target.value);
    if (s.length > 9) s = s.slice(0, 9);
    const { cuerpo, dv } = partirRut(s);
    if (cuerpo && cuerpo.length >= 7) {
      const dvCalc = calcularDV(cuerpo);
      if (dv) {
        if (dv !== dvCalc) { setRutValido(false); setRutMsg(`DV esperado: ${dvCalc}. Se corregirá al salir del campo.`); }
        else { setRutValido(true); setRutMsg("RUT válido."); }
      } else { setRutValido(false); setRutMsg(`DV sugerido: ${dvCalc}`); }
    } else { setRutValido(true); setRutMsg(""); }
    onCambiarDato("rut", s);
  };

  const handleRutBlur = () => {
    const s = limpiarRut(datos?.rut || "");
    if (!s) { setRutValido(false); setRutMsg("Ingrese un RUT."); return; }
    const { cuerpo } = partirRut(s);
    if (!/^\d{1,8}$/.test(cuerpo)) { setRutValido(false); setRutMsg("RUT incompleto."); return; }
    const dvCalc = calcularDV(cuerpo);
    onCambiarDato("rut", formatearRut(cuerpo, dvCalc));
    setRutValido(true); setRutMsg("RUT formateado.");
  };

  const handleSubmit = (e) => {
    const v = validarRut(datos?.rut || "");
    if (!v.valido) { e.preventDefault(); setRutValido(false); setRutMsg(v.motivo ? `RUT inválido: ${v.motivo}.` : "RUT inválido."); return; }

    const dolor = (datos?.dolor || "").toLowerCase();
    const requiereCirugia = isPreop && (dolor.includes("rodilla") || dolor.includes("cadera"));
    if (requiereCirugia) {
      if (!tipoCirugia) { e.preventDefault(); alert("Seleccione el tipo de cirugía."); return; }
      if (tipoCirugia.startsWith("Otro") && !tipoCirugiaLibre.trim()) {
        e.preventDefault(); alert("Especifique el tipo de cirugía."); return;
      }
    }

    onSubmit(e);
  };

  const showCirugia =
    isPreop &&
    ((datos?.dolor || "").toLowerCase().includes("rodilla") ||
     (datos?.dolor || "").toLowerCase().includes("cadera"));

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

      {showCirugia && (
        <>
          <label style={styles.label}>Tipo de cirugía:</label>
          <select
            style={styles.input}
            value={tipoCirugia}
            onChange={(e) => { setTipoCirugia(e.target.value); guardarCirugia(e.target.value, tipoCirugiaLibre); }}
          >
            <option value="">Seleccione…</option>
            {TIPOS_CIRUGIA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {tipoCirugia.startsWith("Otro") && (
            <input
              style={styles.input}
              placeholder="Especifique el tipo de cirugía"
              value={tipoCirugiaLibre}
              onChange={(e) => { setTipoCirugiaLibre(e.target.value); guardarCirugia(tipoCirugia, e.target.value); }}
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

      <button style={styles.button} type="submit">Generar Informe</button>
    </form>
  );
}

/* ================= Estilos (100% theme.json) ================= */
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
  title: { marginBottom: "20px", color: T.primary, textAlign: "center" },
  label: { display: "block", marginTop: "15px", fontWeight: "bold", color: T.text, textAlign: "left" },
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
  help: { fontSize: 12, marginTop: 4, minHeight: 16 },
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
