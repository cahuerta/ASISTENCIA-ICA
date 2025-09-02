"use client";
import React, { useEffect, useState } from "react";

const S = {
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
  textarea:{ width:"100%", padding:10, borderRadius:8, border:"1px solid #d0d7de", minHeight:84, background:"#fff" },
  input:{ width:"100%", padding:10, borderRadius:8, border:"1px solid #d0d7de", background:"#fff" },
  actions:{ display:"flex", gap:10, marginTop:14 },
  btn: { flex:1, background:"#0072CE", color:"#fff", border:"none", padding:"12px 14px", borderRadius:8, cursor:"pointer", fontWeight:700 },
  btnGray: { flex:1, background:"#667085", color:"#fff", border:"none", padding:"12px 14px", borderRadius:8, cursor:"pointer", fontWeight:700 },
};

const LISTA = [
  { key:"hta", label:"Hipertensión arterial" },
  { key:"dm2", label:"Diabetes mellitus tipo 2" },
  { key:"dislipidemia", label:"Dislipidemia" },
  { key:"obesidad", label:"Obesidad" },
  { key:"tabaquismo", label:"Tabaquismo activo" },
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
    alergias: "",
    otras: "",
    ...initial,
  });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("comorbilidadesJSON");
      if (saved && !initial.__skipLoad) {
        const data = JSON.parse(saved);
        setForm(prev => ({ ...prev, ...data }));
      }
    } catch {}
  }, [initial]);

  const setYN = (key, val) => setForm(f => ({ ...f, [key]: !!val }));
  const guardar = () => {
    sessionStorage.setItem("comorbilidadesJSON", JSON.stringify(form));
    onSave?.(form);
  };

  return (
    <div style={S.card}>
      <div style={S.title}>Comorbilidades</div>

      <div style={S.grid}>
        {LISTA.map(({ key, label }) => (
          <div key={key} style={S.row}>
            <label style={S.label}>{label}</label>
            <div style={S.seg}>
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
          </div>
        ))}

        <div style={{ ...S.row, gridColumn:"1/-1" }}>
          <label style={S.label}>Alergias (texto libre)</label>
          <textarea
            style={S.textarea}
            value={form.alergias}
            onChange={(e)=>setForm(f=>({ ...f, alergias: e.target.value }))}
            placeholder="Ej.: penicilina, AINES, mariscos…"
          />
        </div>

        <div style={{ ...S.row, gridColumn:"1/-1" }}>
          <label style={S.label}>Otras comorbilidades (opcional)</label>
          <input
            style={S.input}
            value={form.otras}
            onChange={(e)=>setForm(f=>({ ...f, otras: e.target.value }))}
            placeholder="Ej.: VIH, enfermedad hepática, epilepsia…"
          />
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" style={S.btnGray} onClick={()=>onCancel?.()}>Cancelar</button>
        <button type="button" style={S.btn} onClick={guardar}>Guardar</button>
      </div>
    </div>
  );
}
