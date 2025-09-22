"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getTheme } from "../theme.js"; // ← ruta correcta para src/components/*

/** ====== Preguntas Sí/No (claves estables para backend) ====== */
const ITEMS = [
  // Dispositivos y metales (riesgo alto si SÍ)
  { key: "marcapasos", label: "¿Tiene marcapasos o desfibrilador implantado (DAI)?" },
  { key: "coclear_o_neuro", label: "¿Tiene implante coclear o neuroestimulador?" },
  { key: "clips_aneurisma", label: "¿Tiene clips de aneurisma cerebral?" },
  { key: "valvula_cardiaca_metal", label: "¿Tiene válvula cardíaca u otro implante metálico intracraneal?" },
  { key: "fragmentos_metalicos", label: "¿Tiene fragmentos metálicos/balas (en ojos o cuerpo)?" },

  // Cirugías / prótesis
  { key: "protesis_placas_tornillos", label: "¿Tiene prótesis, placas o tornillos metálicos?" },
  { key: "cirugia_reciente_3m", label: "¿Cirugía reciente (< 3 meses) con implante?" },

  // Situaciones clínicas
  { key: "embarazo", label: "¿Embarazo o sospecha de embarazo?" },
  { key: "claustrofobia", label: "¿Claustrofobia importante?" },
  { key: "peso_mayor_150", label: "¿Peso mayor a 150 kg (límite equipo)?" },
  { key: "no_permanece_inmovil", label: "¿Dificultad para permanecer inmóvil 20–30 min?" },

  // Piel / perforaciones
  { key: "tatuajes_recientes", label: "¿Tatuajes o maquillaje permanente hechos hace < 6 semanas?" },
  { key: "piercings_no_removibles", label: "¿Piercings que no puede retirar?" },

  // Dispositivos externos
  { key: "bomba_insulina_u_otro", label: "¿Usa bomba de insulina u otro dispositivo externo?" },

  // Contraste (gadolinio)
  { key: "requiere_contraste", label: "¿Este examen requiere contraste (gadolinio)?" },
  { key: "erc_o_egfr_bajo", label: "¿Insuficiencia renal conocida o eGFR < 30?" },
  { key: "alergia_gadolinio", label: "¿Alergia previa a gadolinio?" },
  { key: "reaccion_contrastes", label: "¿Reacción alérgica grave previa a otros contrastes?" },

  // Sedación / ayuno
  { key: "requiere_sedacion", label: "¿Requiere sedación para poder realizar el examen?" },
  { key: "ayuno_6h", label: "¿Ha cumplido ayuno de 6 horas? (si habrá sedación)" },
];

/** ====== Utilidad ====== */
const baseState = () => ITEMS.reduce((acc, it) => ({ ...acc, [it.key]: null }), {});

function makeStyles(T) {
  return {
    card: {
      background: T.surface || "#fff",
      borderRadius: 12,
      padding: 16,
      boxShadow: T.shadowSm || "0 2px 10px rgba(0,0,0,0.06)",
      maxHeight: "80vh",
      overflowY: "auto",
      color: T.text || "#0f172a",
      border: `1px solid ${T.border || "#e5e7eb"}`,
    },
    title: { fontWeight: 800, fontSize: 18, marginBottom: 10, color: T.primaryDark || T.primary },
    grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" },
    row: { display: "grid", gap: 6 },
    label: { fontWeight: 600, fontSize: 13, lineHeight: 1.2, color: T.textMuted || "#475569" },
    seg: { display: "flex", gap: 6 },
    segBtn: (active) => ({
      flex: 1,
      padding: "10px 12px",
      borderRadius: 8,
      border: `1px solid ${T.border || "#d0d7de"}`,
      background: active ? T.primary || "#0072CE" : T.surface || "#fff",
      color: active ? T.onPrimary || "#fff" : T.text || "#111",
      cursor: "pointer",
      fontWeight: 700,
      textAlign: "center",
    }),
    actions: {
      position: "sticky",
      bottom: 0,
      background: `linear-gradient(transparent, ${T.surface || "#fff"} 40%)`,
      paddingTop: 12,
      display: "flex",
      gap: 10,
      marginTop: 14,
      flexWrap: "wrap",
      borderTop: `1px solid ${T.border || "#e5e7eb"}`,
    },
    btn: {
      flex: "1 0 200px",
      background: T.primary || "#0072CE",
      color: T.onPrimary || "#fff",
      border: "none",
      padding: "12px 14px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      boxShadow: T.shadowSm,
    },
    btnGray: {
      flex: "1 0 200px",
      background: T.muted || "#667085",
      color: T.onMuted || "#fff",
      border: "none",
      padding: "12px 14px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
    },
    hint: { fontSize: 12, color: T.textMuted || "#555" },
    warnCard: {
      background: T.warningBg || "#fff8e1",
      border: `1px solid ${T.warningBorder || "#ffe08a"}`,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      color: T.warningText || "#5f370e",
    },
    okCard: {
      background: T.successBg || "#e6fffa",
      border: `1px solid ${T.successBorder || "#b2f5ea"}`,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      color: T.successText || "#234e52",
    },
    textarea: {
      width: "100%",
      padding: 10,
      borderRadius: 8,
      border: `1px solid ${T.border || "#d0d7de"}`,
      minHeight: 84,
      background: T.surface || "#fff",
      color: T.text || "#0f172a",
    },
  };
}

/**
 * FormularioResonancia
 * - Usa tema desde theme.json (getTheme)
 * - Solo valida y entrega datos al padre vía onSave(form)
 */
export default function FormularioResonancia({
  initial = {},
  onSave,
  onCancel,
}) {
  const T = getTheme();
  const S = makeStyles(T);

  const [form, setForm] = useState({
    ...baseState(),
    observaciones: "",
    ...initial,
  });

  // Carga desde sessionStorage si existe (opcional UX)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("resonanciaJSON");
      if (saved && !initial.__skipLoad) {
        const data = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...data }));
      }
    } catch {}
  }, [initial]);

  // Helpers
  const setYN = (key, val) => setForm((f) => ({ ...f, [key]: !!val }));
  const responderTodoNo = () => {
    const allNo = ITEMS.reduce((a, it) => ({ ...a, [it.key]: false }), {});
    setForm((f) => ({ ...f, ...allNo }));
  };

  const faltantes = useMemo(
    () => ITEMS.filter((it) => form[it.key] === null).map((it) => it.key),
    [form]
  );

  const riesgos = useMemo(() => {
    const r = [];
    const si = (k) => form[k] === true;

    // Contraindicaciones/alertas mayores
    if (si("marcapasos")) r.push("Marcapasos/DAI");
    if (si("coclear_o_neuro")) r.push("Implante coclear/neuroestimulador");
    if (si("clips_aneurisma")) r.push("Clips de aneurisma");
    if (si("valvula_cardiaca_metal")) r.push("Válvula/implante metálico intracraneal");
    if (si("fragmentos_metalicos")) r.push("Fragmentos metálicos/balas");

    // Precauciones frecuentes
    if (si("embarazo")) r.push("Embarazo/sospecha");
    if (si("claustrofobia")) r.push("Claustrofobia importante");
    if (si("peso_mayor_150")) r.push("Peso > 150 kg");
    if (si("no_permanece_inmovil")) r.push("Dificultad para inmovilidad");
    if (si("tatuajes_recientes")) r.push("Tatuajes/PMU < 6 semanas");
    if (si("piercings_no_removibles")) r.push("Piercings no removibles");
    if (si("bomba_insulina_u_otro")) r.push("Dispositivo externo activo");

    // Contraste
    if (si("requiere_contraste")) {
      if (si("erc_o_egfr_bajo")) r.push("Insuficiencia renal / eGFR < 30");
      if (si("alergia_gadolinio")) r.push("Alergia a gadolinio");
      if (si("reaccion_contrastes")) r.push("Reacción a contrastes previos");
    }

    // Sedación
    if (si("requiere_sedacion") && form["ayuno_6h"] === false) {
      r.push("Sedación sin ayuno 6h");
    }

    return r;
  }, [form]);

  const guardar = () => {
    if (faltantes.length) {
      alert("Responde todas las preguntas (Sí/No) antes de guardar.");
      return;
    }
    // Persistencia local (opcional UX)
    sessionStorage.setItem("resonanciaJSON", JSON.stringify(form));
    // Entregar al padre (él persiste en backend junto con el resto)
    onSave?.(form, { riesgos });
  };

  return (
    <div style={S.card}>
      <div style={S.title}>Formulario Resonancia (Sí/No)</div>

      {/* Resumen dinámico */}
      {riesgos.length > 0 ? (
        <div style={S.warnCard}>
          <strong>Alertas relevantes:</strong>
          <ul style={{ margin: "6px 0 0 18px" }}>
            {riesgos.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <div style={S.hint}>
            Este resumen es informativo; la decisión clínica y logística se define fuera del formulario.
          </div>
        </div>
      ) : (
        <div style={S.okCard}>
          <strong>Sin alertas marcadas.</strong> Completa todas las respuestas para confirmar.
        </div>
      )}

      {/* Preguntas Sí/No */}
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
          </div>
        ))}
      </div>

      {/* Observaciones opcional */}
      <div style={{ marginTop: 12 }}>
        <div style={S.row}>
          <label style={S.label}>Observaciones (opcional)</label>
          <textarea
            style={S.textarea}
            value={form.observaciones}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            placeholder="Notas: fechas de cirugía, tipo de dispositivo, documentación adjunta, etc."
          />
        </div>
      </div>

      {/* Acciones */}
      <div style={S.actions}>
        <button type="button" style={S.btnGray} onClick={responderTodoNo}>
          Marcar todo en No
        </button>
        <button type="button" style={S.btnGray} onClick={() => onCancel?.()}>
          Cancelar
        </button>
        <button type="button" style={S.btn} onClick={guardar}>
          Guardar
        </button>
      </div>

      <div style={{ marginTop: 8, ...S.hint }}>
        * Este formulario no reemplaza la evaluación médica; sirve para screening de seguridad y logística del examen.
      </div>
    </div>
  );
}
