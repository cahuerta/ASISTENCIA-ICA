// src/components/FormularioResonancia.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

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

const baseState = () => ITEMS.reduce((acc, it) => ({ ...acc, [it.key]: null }), {});

export default function FormularioResonancia({
  initial = {},
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    ...baseState(),
    observaciones: "",
    ...initial,
  });

  // Carga desde sessionStorage si existe (UX: continuar donde quedó)
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
    <div
      className="card"
      style={{
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      <div className="h1" style={{ fontWeight: 800, fontSize: 18, marginBottom: 10, color: "var(--primary-dark, var(--primary))" }}>
        Formulario Resonancia (Sí/No)
      </div>

      {/* Resumen dinámico */}
      {riesgos.length > 0 ? (
        <div
          style={{
            background: "var(--warning-bg, #fff8e1)",
            border: "1px solid var(--warning-border, #ffe08a)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            color: "var(--warning-text, #5f370e)",
          }}
        >
          <strong>Alertas relevantes:</strong>
          <ul style={{ margin: "6px 0 0 18px" }}>
            {riesgos.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Este resumen es informativo; la decisión clínica y logística se define fuera del formulario.
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--success-bg, #e6fffa)",
            border: "1px solid var(--success-border, #b2f5ea)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            color: "var(--success-text, #234e52)",
          }}
        >
          <strong>Sin alertas marcadas.</strong> Completa todas las respuestas para confirmar.
        </div>
      )}

      {/* Preguntas Sí/No */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {ITEMS.map(({ key, label }) => (
          <div key={key} style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2, color: "var(--text-muted)" }}>
              {label}
            </label>
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
          </div>
        ))}
      </div>

      {/* Observaciones opcional */}
      <div className="mt-12">
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2, color: "var(--text-muted)" }}>
            Observaciones (opcional)
          </label>
          <textarea
            value={form.observaciones}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            placeholder="Notas: fechas de cirugía, tipo de dispositivo, documentación adjunta, etc."
            style={{ minHeight: 84 }}
          />
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
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={responderTodoNo}
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
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
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

      <div className="mt-12" style={{ fontSize: 12, color: "var(--text-muted)" }}>
        * Este formulario no reemplaza la evaluación médica; sirve para screening de seguridad y logística del examen.
      </div>
    </div>
  );
}
