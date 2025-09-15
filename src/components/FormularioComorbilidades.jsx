"use client";
import React, { useEffect, useMemo, useState } from "react";

/** ====== Estilos ====== */
const S = {
  card: {
    background:"#fff",
    borderRadius:12,
    padding:16,
    boxShadow:"0 2px 10px rgba(0,0,0,0.06)",
    maxHeight:"80vh",
    overflowY:"auto",
  },
  title: { fontWeight:800, fontSize:18, marginBottom:10 },
  grid: { display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))" },
  row: { display:"grid", gap:6 },
  label: { fontWeight:600, fontSize:13, lineHeight:1.2 },
  seg: { display:"flex", gap:6 },
  segBtn: (active) => ({
    flex:1,
    padding:"10px 12px",
    borderRadius:8,
    border:"1px solid #d0d7de",
    background: active ? "#0072CE" : "#fff",
    color: active ? "#fff" : "#111",
    cursor:"pointer",
    fontWeight:700,
    textAlign:"center"
  }),
  input:{
    width:"100%",
    padding:10,
    borderRadius:8,
    border:"1px solid #d0d7de",
    background:"#fff"
  },
  actions:{
    position:"sticky",
    bottom:0,
    background:"linear-gradient(transparent, #fff 40%)",
    paddingTop:12,
    display:"flex",
    gap:10,
    marginTop:14,
    flexWrap:"wrap"
  },
  btn: {
    flex:"1 0 200px",
    background:"#0072CE",
    color:"#fff",
    border:"none",
    padding:"12px 14px",
    borderRadius:8,
    cursor:"pointer",
    fontWeight:700
  },
  btnGray: {
    flex:"1 0 200px",
    background:"#667085",
    color:"#fff",
    border:"none",
    padding:"12px 14px",
    borderRadius:8,
    cursor:"pointer",
    fontWeight:700
  },
  hint:{ fontSize:12, color:"#555" },
  error:{ fontSize:12, color:"#B42318" },
  hintRow:{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#667085" },
};

/** ====== Ítems Sí/No ====== */
const ITEMS = [
  { key:"hta", label:"Hipertensión arterial" },
  { key:"dm2", label:"Diabetes mellitus tipo 2" },
  { key:"dislipidemia", label:"Dislipidemia" },
  { key:"obesidad", label:"Obesidad" },
  { key:"tabaquismo", label:"Tabaco" },
  { key:"epoc_asma", label:"EPOC / Asma" },
  { key:"cardiopatia", label:"Cardiopatía (coronaria/insuficiencia)" },
  { key:"erc", label:"Enfermedad renal crónica" },
  { key:"hipotiroidismo", label:"Hipotiroidismo" },
  { key:"anticoagulantes", label:"Uso de anticoagulantes/antiagregantes" },
  { key:"artritis_reumatoide", label:"Artritis reumatoide / autoinmune" },
];

const baseState = () => ITEMS.reduce((acc, it) => ({ ...acc, [it.key]: null }), {});

/** ====== Componente ====== */
export default function FormularioComorbilidades({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...baseState(),
    alergias_flag: null,
    alergias_detalle: "",
    otras: "",
    anticoagulantes_detalle: "",
    ...initial,
  });

  const [errors, setErrors] = useState({});
  const MAX_ALERGIA = 80;
  const MAX_OTRAS = 120;

  /** 👉 Hidratar cada vez que cambie `initial` (lo entrega App.jsx por scope) */
  useEffect(() => {
    setForm((prev) => ({
      ...baseState(),
      alergias_flag: null,
      alergias_detalle: "",
      otras: "",
      anticoagulantes_detalle: "",
      ...initial,
    }));
  }, [initial]);

  const setYN = (key, val) => setForm((f) => ({ ...f, [key]: !!val }));

  const faltantes = useMemo(() => {
    const keysYN = [...ITEMS.map((i) => i.key), "alergias_flag"];
    return keysYN.filter((k) => form[k] === null);
  }, [form]);

  const validar = () => {
    const e = {};
    if (form.anticoagulantes === true && !String(form.anticoagulantes_detalle || "").trim()) {
      e.anticoagulantes_detalle = "Indique cuál(es).";
    }
    if (form.alergias_flag === true && !String(form.alergias_detalle || "").trim()) {
      e.alergias_detalle = "Indique cuál(es).";
    }
    if (faltantes.length) e.__faltantes = "Responde todas las preguntas (Sí/No).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = () => {
    if (!validar()) return;

    const payload = {
      hta: !!form.hta,
      dm2: !!form.dm2,
      dislipidemia: !!form.dislipidemia,
      obesidad: !!form.obesidad,
      tabaquismo: !!form.tabaquismo,
      epoc_asma: !!form.epoc_asma,
      cardiopatia: !!form.cardiopatia,
      erc: !!form.erc,
      hipotiroidismo: !!form.hipotiroidismo,
      anticoagulantes: !!form.anticoagulantes,
      artritis_reumatoide: !!form.artritis_reumatoide,

      alergias_flag: !!form.alergias_flag,
      alergias_detalle: (form.alergias_detalle || "").slice(0, MAX_ALERGIA).trim(),
      otras: (form.otras || "").slice(0, MAX_OTRAS).trim(),
      anticoagulantes_detalle: (form.anticoagulantes_detalle || "").trim(),
    };

    /** ❌ Nada de sessionStorage aquí. El padre persiste por scope. */
    onSave?.(payload); // App.jsx cierra el modal y continúa el flujo
    // ❌ No llamamos onCancel() aquí para evitar “doble cierre/doble apertura”.
  };

  return (
    <div style={S.card}>
      <div style={S.title}>Comorbilidades</div>

      {errors.__faltantes && (
        <div style={{ marginBottom:10, color:"#B42318", fontSize:13 }}>
          {errors.__faltantes}
        </div>
      )}

      <div style={S.grid}>
        {ITEMS.map(({ key, label }) => (
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
      </div>

      <div style={{ marginTop:12 }}>
        <div style={S.row}>
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
            <>
              <input
                style={S.input}
                maxLength={MAX_ALERGIA}
                value={form.alergias_detalle}
                onChange={(e)=>setForm(f=>({ ...f, alergias_detalle: e.target.value }))}
                placeholder="¿Cuál(es)? (p. ej., penicilina, AINES)"
              />
              <div style={S.hintRow}>
                <span>Indique cuál(es).</span>
                <span>{(form.alergias_detalle || "").length}/{MAX_ALERGIA}</span>
              </div>
              {errors.alergias_detalle && <div style={S.error}>{errors.alergias_detalle}</div>}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop:12 }}>
        <div style={S.row}>
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
        <button type="button" style={S.btnGray} onClick={()=>onCancel?.()}>
          Cancelar
        </button>
        <button type="button" style={S.btn} onClick={guardar}>
          Guardar
        </button>
      </div>
    </div>
  );
}
