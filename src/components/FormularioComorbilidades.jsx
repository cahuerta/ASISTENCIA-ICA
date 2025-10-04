// src/components/FormularioComorbilidades.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

/** ====== Ítems Sí/No ====== */
const ITEMS = [
  { key: "hta", label: "Hipertensión arterial" },
  { key: "dm2", label: "Diabetes mellitus tipo 2" },
  { key: "dislipidemia", label: "Dislipidemia" },
  { key: "obesidad", label: "Obesidad" },
  { key: "tabaquismo", label: "Tabaco" },
  { key: "epoc_asma", label: "EPOC / Asma" },
  { key: "cardiopatia", label: "Cardiopatía (coronaria/insuficiencia)" },
  { key: "erc", label: "Enfermedad renal crónica" },
  { key: "hipotiroidismo", label: "Hipotiroidismo" },
  { key: "anticoagulantes", label: "Uso de anticoagulantes/antiagregantes" },
  { key: "artritis_reumatoide", label: "Artritis reumatoide / autoinmune" },
];

const baseState = () => ITEMS.reduce((acc, it) => ({ ...acc, [it.key]: null }), {});

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

  /** 👉 Hidratar cada vez que cambie `initial` */
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

  /** 👉 Marcar todo en No */
  const marcarTodoNo = () => {
    const allNo = ITEMS.reduce((a, it) => ({ ...a, [it.key]: false }), {});
    setForm((f) => ({
      ...f,
      ...allNo,
      alergias_flag: false,
      alergias_detalle: "",
      anticoagulantes_detalle: "",
    }));
  };

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

    onSave?.(payload);
  };

  return (
    <div
      className="card"
      style={{
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      <div className="h1" style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
        Comorbilidades
      </div>

      {errors.__faltantes && (
        <div style={{ marginBottom: 10, color: "var(--danger, #B42318)", fontSize: 13 }}>
          {errors.__faltantes}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {ITEMS.map(({ key, label }) => (
          <div key={key} style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{label}</label>

            {/* Segmento Sí / No */}
            <div style={{ display: "flex", gap: 6 }} role="group" aria-label={label}>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  background: form[key] === true ? "var(--primary)" : "var(--surface)",
                  color: form[key] === true ? "var(--on-primary,#fff)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => setYN(key, true)}
                aria-pressed={form[key] === true}
              >
                Sí
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  background: form[key] === false ? "var(--primary)" : "var(--surface)",
                  color: form[key] === false ? "var(--on-primary,#fff)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => setYN(key, false)}
                aria-pressed={form[key] === false}
              >
                No
              </button>
            </div>

            {key === "anticoagulantes" && form.anticoagulantes === true && (
              <div>
                <input
                  value={form.anticoagulantes_detalle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, anticoagulantes_detalle: e.target.value }))
                  }
                  placeholder="Detalle: warfarina, DOAC, AAS, clopidogrel…"
                />
                {errors.anticoagulantes_detalle && (
                  <div style={{ fontSize: 12, color: "var(--danger, #B42318)" }}>
                    {errors.anticoagulantes_detalle}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alergias */}
      <div className="mt-12">
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>Alergias</label>

          <div style={{ display: "flex", gap: 6 }} role="group" aria-label="Alergias">
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                background: form.alergias_flag === true ? "var(--primary)" : "var(--surface)",
                color: form.alergias_flag === true ? "var(--on-primary,#fff)" : "var(--text)",
                border: "1px solid var(--border)",
              }}
              onClick={() => setForm((f) => ({ ...f, alergias_flag: true }))}
              aria-pressed={form.alergias_flag === true}
            >
              Sí
            </button>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                background: form.alergias_flag === false ? "var(--primary)" : "var(--surface)",
                color: form.alergias_flag === false ? "var(--on-primary,#fff)" : "var(--text)",
                border: "1px solid var(--border)",
              }}
              onClick={() =>
                setForm((f) => ({ ...f, alergias_flag: false, alergias_detalle: "" }))
              }
              aria-pressed={form.alergias_flag === false}
            >
              No
            </button>
          </div>

          {form.alergias_flag === true && (
            <>
              <input
                maxLength={MAX_ALERGIA}
                value={form.alergias_detalle}
                onChange={(e) => setForm((f) => ({ ...f, alergias_detalle: e.target.value }))}
                placeholder="¿Cuál(es)? (p. ej., penicilina, AINES)"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <span>Indique cuál(es).</span>
                <span>
                  {(form.alergias_detalle || "").length}/{MAX_ALERGIA}
                </span>
              </div>
              {errors.alergias_detalle && (
                <div style={{ fontSize: 12, color: "var(--danger, #B42318)" }}>
                  {errors.alergias_detalle}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Otros */}
      <div className="mt-12">
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
            Otros (opcional)
          </label>
          <input
            maxLength={MAX_OTRAS}
            value={form.otras}
            onChange={(e) => setForm((f) => ({ ...f, otras: e.target.value }))}
            placeholder="Ej.: enfermedad hepática, epilepsia…"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Texto breve</span>
            <span>
              {(form.otras || "").length}/{MAX_OTRAS}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div
        className="mt-12"
        style={{
          position: "sticky",
          bottom: 0,
          background: "linear-gradient(transparent, var(--surface,#fff) 40%)",
          paddingTop: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={marcarTodoNo}
          style={{
            flex: "1 0 200px",
            background: "var(--muted, #667085)",
            border: "1px solid var(--muted, #667085)",
            color: "var(--on-primary,#fff)",
          }}
        >
          Marcar todo en No
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => onCancel?.()}
          style={{
            flex: "1 0 200px",
            background: "var(--muted, #667085)",
            border: "1px solid var(--muted, #667085)",
            color: "var(--on-primary,#fff)",
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="btn"
          onClick={guardar}
          style={{ flex: "1 0 200px" }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
