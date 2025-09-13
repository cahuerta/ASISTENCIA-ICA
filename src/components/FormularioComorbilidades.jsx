"use client";
import React, { useEffect, useState } from "react";

const S = {
  // NUEVO: capa oscura detrás (pantalla completa)
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  // NUEVO: contenedor del modal (tarjeta centrada, con scroll interno)
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
  textarea:{ width:"100%", padding:10, borderRadius:8, border:"1px solid #d0d7de", minHeight:84, background:"#fff" },
  input:{ width:"100%", padding:10, borderRadius:8, border:"1px solid #d0d7de", background:"#fff" },
  actions:{ display:"flex", gap:10, marginTop:14, position:"sticky", bottom:0, background:"#fff", paddingTop:8 },
  btn: { flex:1, background:"#0072CE", color:"#fff", border:"none", padding:"12px 14px", borderRadius:8, cursor:"pointer", fontWeight:700 },
  btnGray: { flex:1, background:"#667085", color:"#fff", border:"none", padding:"12px 14px", borderRadius:8, cursor:"pointer", fontWeight:700 },
  hint: { fontSize:12, color:"#667085" },
  error: { fontSize:12, color:"#B42318", marginTop:4 }
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
    // NUEVOS CAMPOS
    medicamentos: "",
    cirugiasPrevias: "",
    anticoagulantes_detalle: "",
    tabaco: "",
    alcohol: "",
    observaciones: "",
    ...initial,
  });

  const [errors, setErrors] = useState({});

  // Carga desde sessionStorage si existe
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

  // NUEVO: bloquear scroll del body y cierre con ESC
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
      tabaquismo: !!form.tabaquismo,
      epoc_asma: !!form.epoc_asma,
      cardiopatia: !!form.cardiopatia,
      erc: !!form.erc,
      hipotiroidismo: !!form.hipotiroidismo,
      anticoagulantes: !!form.anticoagulantes,
      artritis_reumatoide: !!form.artritis_reumatoide,

      // existentes
      alergias: (form.alergias || "").trim(),
      otras: (form.otras || "").trim(),

      // nuevos
      medicamentos: (form.medicamentos || "").trim(),
      cirugiasPrevias: (form.cirugiasPrevias || "").trim(),
      anticoagulantes_detalle: (form.anticoagulantes_detalle || "").trim(),
      tabaco: (form.tabaco || "").trim(),
      alcohol: (form.alcohol || "").trim(),
      observaciones: (form.observaciones || "").trim(),
    };

    sessionStorage.setItem("comorbilidadesJSON", JSON.stringify(payload));
    onSave?.(payload);
  };

  // NUEVO: cerrar al hacer clic fuera de la tarjeta
  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  return (
    <div style={S.backdrop} onMouseDown={onBackdropClick}>
      <div style={S.shell} onMouseDown={(e) => e.stopPropagation()}>
        <div style={S.card}>
          <div style={S.title}>Comorbilidades</div>

          <div style={S.grid}>
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

            <div style={{ ...S.row, gridColumn:"1/-1" }}>
              <label style={S.label}>Medicamentos actuales</label>
              <textarea
                style={S.textarea}
                value={form.medicamentos}
                onChange={(e)=>setForm(f=>({ ...f, medicamentos: e.target.value }))}
                placeholder="Nombre – dosis – frecuencia (uno por línea)"
              />
              <div style={S.hint}>Ej.: Losartán 50 mg cada 12 h; Metformina 850 mg cada 12 h…</div>
            </div>

            <div style={{ ...S.row, gridColumn:"1/-1" }}>
              <label style={S.label}>Cirugías previas</label>
              <textarea
                style={S.textarea}
                value={form.cirugiasPrevias}
                onChange={(e)=>setForm(f=>({ ...f, cirugiasPrevias: e.target.value }))}
                placeholder="Ej.: Colecistectomía 2015; Meniscectomía 2020…"
              />
            </div>

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
              <label style={S.label}>Tabaquismo</label>
              <input
                style={S.input}
                value={form.tabaco}
                onChange={(e)=>setForm(f=>({ ...f, tabaco: e.target.value }))}
                placeholder="No / Ex / Actual (frecuencia)"
              />
            </div>

            <div style={{ ...S.row, gridColumn:"1/-1" }}>
              <label style={S.label}>Alcohol</label>
              <input
                style={S.input}
                value={form.alcohol}
                onChange={(e)=>setForm(f=>({ ...f, alcohol: e.target.value }))}
                placeholder="No / Ocasional / Frecuente"
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

            <div style={{ ...S.row, gridColumn:"1/-1" }}>
              <label style={S.label}>Observaciones</label>
              <textarea
                style={S.textarea}
                value={form.observaciones}
                onChange={(e)=>setForm(f=>({ ...f, observaciones: e.target.value }))}
                placeholder="Notas adicionales relevantes para el preoperatorio"
              />
            </div>
          </div>

          <div style={S.actions}>
            <button type="button" style={S.btnGray} onClick={()=>onCancel?.()}>Cancelar</button>
            <button type="button" style={S.btn} onClick={guardar}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
