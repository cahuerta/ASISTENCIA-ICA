"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const Z_TOP = 2147483647;
const MAX_ALERGIA = 80;
const MAX_OTRAS = 120;

const S = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: Z_TOP,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  shell: {
    width: "100%",
    maxWidth: 820,
    maxHeight: "80vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 12px 28px rgba(0,0,0,0.20)",
  },
  card: { background:"#fff", borderRadius:12, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" },
  title: { fontWeight:800, fontSize:18, marginBottom:10 },
  grid: { display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))" },
  row: { display:"grid", gap:6 },
  label: { fontWeight:600, fontSize:13 },
  seg: { display:"flex", gap:6 },
  segBtn: (active) => ({
    flex:1, padding:"10px 12px", borderRadius:8, border:"1px solid #d0d7de",
    background: active ? "#0072CE" : "#fff", color: active ? "#fff" : "#111", cursor:"pointer",
    fontWeight:600, textAlign:"center"
  }),
  input:{ width:"100%", padding:10, borderRadius:8, border:"1px solid #d0d7de", background:"#fff" },
  actions:{ display:"flex", gap:10, marginTop:14, position:"sticky", bottom:0, background:"#fff", paddingTop:8 },
  btn: { flex:1, background:"#0072CE", color:"#fff", border:"none", padding:"12px 14px", borderRadius:8, cursor:"pointer", fontWeight:700 },
  btnGray: { flex:1, background:"#667085", color:"#fff", border:"none", padding:"12px 14px", borderRadius:8, cursor:"pointer", fontWeight:700 },
  hintRow: { display:"flex", justifyContent:"space-between", fontSize:12, color:"#667085" },
  error: { fontSize:12, color:"#B42318", marginTop:4 }
};

const LISTA = [
  { key:"hta", label:"Hipertensión arterial" },
  { key:"dm2", label:"Diabetes mellitus tipo 2" },
  { key:"dislipidemia", label:"Dislipidemia" },
  { key:"obesidad", label:"Obesidad" },
  { key:"tabaquismo", label:"Tabaquismo activo" }, // lo mantengo como flag por si lo necesitas binario
  { key:"epoc_asma", label:"EPOC / Asma" },
  { key:"cardiopatia", label:"Cardiopatía (coronaria/insuficiencia)" },
  { key:"erc", label:"Enfermedad renal crónica" },
  { key:"hipotiroidismo", label:"Hipotiroidismo" },
  { key:"anticoagulantes", label:"Uso de anticoagulantes/antiagregantes" },
  { key:"artritis_reumatoide", label:"Artritis reumatoide u otra autoinmune" },
];

export default function FormularioComorbilidades({ initial = {}, onSave, onCancel }) {
  const base = LISTA.reduce((acc, it) => ({ ...acc, [it.key]: false }), {});
  const [form, setForm] = useState({
    ...base,

    // nuevo modelo simplificado
    alergias_flag: false,              // Sí/No
    alergias_detalle: "",              // corto cuando Sí
    otras: "",                         // texto corto “Otros”
    anticoagulantes_detalle: "",       // se mantiene cuando anticoagulantes = Sí

    ...initial,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("comorbilidadesJSON");
      if (saved && !initial.__skipLoad) {
        const data = JSON.parse(saved);
        setForm(prev => ({ ...prev, ...data }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const setYN = (key, val) => setForm(f => ({ ...f, [key]: !!val }));

  const validar = () => {
    const e = {};
    if (form.alergias_flag === true && !String(form.alergias_detalle || "").trim()) {
      e.alergias_detalle = "Indique cuál(es).";
    }
    if (form.anticoagulantes === true && !String(form.anticoagulantes_detalle || "").trim()) {
      e.anticoagulantes_detalle = "Indique cuál/es.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;
    const payload = {
      // flags sí/no
      hta: !!form.hta,
      dm2: !!form.dm2,
      dislipidemia: !!form.dislipidemia,
      obesidad: !!form.obesidad,
      tabaquismo: !!form.tabaquismo,             // binario (no texto)
      epoc_asma: !!form.epoc_asma,
      cardiopatia: !!form.cardiopatia,
      erc: !!form.erc,
      hipotiroidismo: !!form.hipotiroidismo,
      anticoagulantes: !!form.anticoagulantes,
      artritis_reumatoide: !!form.artritis_reumatoide,

      // simplificados
      alergias_flag: !!form.alergias_flag,
      alergias_detalle: (form.alergias_detalle || "").slice(0, MAX_ALERGIA).trim(),
      otras: (form.otras || "").slice(0, MAX_OTRAS).trim(),
      anticoagulantes_detalle: (form.anticoagulantes_detalle || "").trim(),
    };

    sessionStorage.setItem("comorbilidadesJSON", JSON.stringify(payload));
    onSave?.(payload);
  };

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  return createPortal(
    <div style={S.backdrop} onMouseDown={onBackdropClick} role="dialog" aria-modal="true">
      <div style={S.shell} onMouseDown={(e) => e.stopPropagation()}>
        <div style={S.card}>
          <div style={S.title}>Comorbilidades</div>

          <div style={S.grid}>
            {/* Lista de comorbilidades binarias */}
            {LISTA.map(({ key, label }) => (
              <div key={key} style={S.row}>
                <label style={S.label}>{label}</label>
                <div style={S.seg} role="group" aria-label={label}>
                  <button
                    type="button"
                    style={S.segBtn(form[key] === true)}
                    onClick={() => setYN(key, true)}
                    aria-pressed={form[key] === true}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    style={S.segBtn(form[key] === false)}
                    onClick={() => setYN(key, false)}
                    aria-pressed={form[key] === false}
                  >
                    No
                  </button>
                </div>

                {/* Detalle solo si usa anticoagulantes */}
                {key === "anticoagulantes" && form.anticoagulantes === true && (
                  <div>
                    <input
                      style={S.input}
                      value={form.anticoagulantes_detalle}
                      onChange={(e)=>setForm(f=>({ ...f, anticoagulantes_detalle: e.target.value }))}
                      placeholder="Detalle: warfarina, DOAC, AAS, clopidogrel…"
                    />
                    {errors.anticoagulantes_detalle && (
                      <div style={S.error}>{errors.anticoagulantes_detalle}</div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Alergias: Sí/No + texto corto cuando Sí */}
            <div style={{ ...S.row, gridColumn:"1/-1" }}>
              <label style={S.label}>Alergias</label>
              <div style={S.seg} role="group" aria-label="Alergias">
                <button
                  type="button"
                  style={S.segBtn(form.alergias_flag === true)}
                  onClick={() => setForm(f => ({ ...f, alergias_flag: true }))}
                  aria-pressed={form.alergias_flag === true}
                >
                  Sí
                </button>
                <button
                  type="button"
                  style={S.segBtn(form.alergias_flag === false)}
                  onClick={() => setForm(f => ({ ...f, alergias_flag: false, alergias_detalle: "" }))}
                  aria-pressed={form.alergias_flag === false}
                >
                  No
                </button>
              </div>

              {form.alergias_flag === true && (
                <div>
                  <input
                    style={S.input}
                    maxLength={MAX_ALERGIA}
                    value={form.alergias_detalle}
                    onChange={(e)=>setForm(f=>({ ...f, alergias_detalle: e.target.value }))}
                    placeholder="¿Cuál(es)? (p. ej., penicilina, AINES)"
                  />
                  <div style={S.hintRow}>
                    <span>Indique cuál(es)</span>
                    <span>{(form.alergias_detalle || "").length}/{MAX_ALERGIA}</span>
                  </div>
                  {errors.alergias_detalle && <div style={S.error}>{errors.alergias_detalle}</div>}
                </div>
              )}
            </div>

            {/* Otros: texto corto acotado */}
            <div style={{ ...S.row, gridColumn:"1/-1" }}>
              <label style={S.label}>Otros (opcional)</label>
              <input
                style={S.input}
                maxLength={MAX_OTRAS}
                value={form.otras}
                onChange={(e)=>setForm(f=>({ ...f, otras: e.target.value }))}
                placeholder="Ej.: enfermedad hepática, epilepsia…"
              />
              <div style={S.hintRow}>
                <span>Texto breve</span>
                <span>{(form.otras || "").length}/{MAX_OTRAS}</span>
              </div>
            </div>
          </div>

          <div style={S.actions}>
            <button type="button" style={S.btnGray} onClick={()=>onCancel?.()}>Cancelar</button>
            <button type="button" style={S.btn} onClick={guardar}>Guardar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
