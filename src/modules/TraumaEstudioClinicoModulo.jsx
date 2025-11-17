"use client";
import React, { useState } from "react";
import { getTheme } from "../theme.js";

/* Esquema ICA (los mismos del módulo Trauma) */
import EsquemaAnterior from "../EsquemaAnterior.jsx";
import EsquemaPosterior from "../EsquemaPosterior.jsx";
import EsquemaToggleTabs from "../EsquemaToggleTabs.jsx";
import AvisoLegal from "../components/AvisoLegal.jsx";

/**
 * Backend principal de IA (el mismo que usas en ICA para trauma).
 * Ajusta la URL si es distinto.
 */
const IA_BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE ||
  "https://asistencia-ica-backend.onrender.com";

/**
 * Backend SEPARADO para Estudio Clínico (Google Sheets).
 * Es tu backend nuevo (el Node que tiene /api/traumatologo y /api/pacientes).
 * EJEMPLO: https://trabajo-schot-backend.onrender.com
 */
const ESTUDIO_BACKEND_BASE =
  import.meta.env.VITE_ESTUDIO_BACKEND_BASE || "";

export default function TraumaEstudioClinicoModulo() {
  const theme = getTheme();

  const [vista, setVista] = useState("anterior"); // "anterior" | "posterior"
  const [form, setForm] = useState({
    nombre: "",
    rut: "",
    edad: "",
    dolor: "",
    lado: "",
    sintomas: "",
    iaTexto: "",
    indicacionMedico: "",
  });
  const [loadingIA, setLoadingIA] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const onCambiarDato = (campo, valor) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  // El esquema llama con strings tipo "Rodilla derecha", "Cadera izquierda", etc.
  const onSeleccionZona = (zona) => {
    if (!zona) return;
    const z = zona.toLowerCase();

    setForm((f) => {
      const nuevo = { ...f };

      if (z.includes("rodilla")) {
        nuevo.dolor = "Rodilla";
      } else if (z.includes("cadera")) {
        nuevo.dolor = "Cadera";
      } else if (z.includes("columna")) {
        nuevo.dolor = "Columna lumbar";
      }

      if (z.includes("derecha")) nuevo.lado = "Derecha";
      if (z.includes("izquierda")) nuevo.lado = "Izquierda";

      return nuevo;
    });
  };

  // 1) Llamar a la IA de Trauma (solo preview, sin pago ni PDF)
  async function handleGenerarIA(e) {
    e.preventDefault();
    if (!IA_BACKEND_BASE) {
      alert("Falta configurar VITE_BACKEND_BASE para el backend de IA");
      return;
    }

    setLoadingIA(true);
    try {
      const resp = await fetch(`${IA_BACKEND_BASE}/ia/trauma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          rut: form.rut,
          edad: form.edad,
          dolor: form.dolor,
          lado: form.lado,
          sintomas: form.sintomas,
          modo: "estudio_clinico", // para que el backend sepa que es estudio
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data) {
        throw new Error(data?.error || "Error al llamar a la IA de trauma");
      }

      // Ajusta estos campos según lo que realmente devuelva tu backend de IA
      const textoIA =
        data.resumen ||
        data.orden ||
        data.texto ||
        JSON.stringify(data, null, 2);

      setForm((f) => ({ ...f, iaTexto: textoIA }));
    } catch (err) {
      console.error(err);
      alert("Error al llamar a la IA: " + err.message);
    } finally {
      setLoadingIA(false);
    }
  }

  // 2) Guardar el caso en Google Sheets (estudio clínico)
  async function handleGuardarCaso(e) {
    e.preventDefault();

    if (!ESTUDIO_BACKEND_BASE) {
      alert(
        "Falta configurar VITE_ESTUDIO_BACKEND_BASE (backend de estudio clínico / Sheets)"
      );
      return;
    }

    if (!form.nombre || !form.rut || !form.edad) {
      alert("Falta nombre, RUT o edad");
      return;
    }

    setLoadingSave(true);
    try {
      // Aquí usamos el endpoint /api/traumatologo de tu backend de Sheets
      const payload = {
        pacienteNombre: form.nombre,
        rut: form.rut,
        edad: form.edad,
        // Puedes decidir si guardar la propuesta IA, los síntomas, o ambos
        examenSolicitado: form.iaTexto || form.sintomas || "Sin IA",
        nombreMedico: form.indicacionMedico || "Estudio clínico ICA",
      };

      const resp = await fetch(
        `${ESTUDIO_BACKEND_BASE}/api/traumatologo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "Error al guardar en estudio clínico");
      }

      alert("Caso guardado en estudio clínico (Google Sheets)");

      // Limpia parte de los datos (deja dolor/lado si quieres seguir marcando)
      setForm((f) => ({
        ...f,
        nombre: "",
        rut: "",
        edad: "",
        sintomas: "",
        iaTexto: "",
        indicacionMedico: "",
      }));
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "32px auto",
        padding: "0 12px 48px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            color: theme.primary ?? "#0d2a58",
          }}
        >
          Trauma · Estudio clínico (sin pago)
        </h1>
        <p style={{ margin: "4px 0 0", color: "#555", fontSize: 14 }}>
          Este módulo usa el mismo esquema de trauma, pero solo para estudio
          clínico: se muestra la propuesta de IA y se guardan los datos en
          Google Sheets. No se generan órdenes formales ni se realiza pago.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.2fr)",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Columna izquierda: esquema */}
        <div>
          <EsquemaToggleTabs vista={vista} onChange={setVista} />

          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 12,
              background: "#fff",
              boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
            }}
          >
            {vista === "anterior" ? (
              <EsquemaAnterior onSeleccionZona={onSeleccionZona} />
            ) : (
              <EsquemaPosterior onSeleccionZona={onSeleccionZona} />
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 14, color: "#333" }}>
            <b>Zona seleccionada:</b>{" "}
            {form.dolor || "—"} {form.lado ? `(${form.lado})` : ""}
          </div>

          <div style={{ marginTop: 16 }}>
            <AvisoLegal />
          </div>
        </div>

        {/* Columna derecha: formulario + IA + guardado */}
        <form
          onSubmit={handleGuardarCaso}
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "24px 28px 28px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 18,
              color: theme.primary ?? "#0d2a58",
            }}
          >
            Registro para estudio clínico
          </h2>

          {/* Datos del paciente */}
          <div style={{ display: "grid", gap: 12 }}>
            <label style={labelStyle}>
              Nombre completo
              <input
                style={inputStyle}
                type="text"
                value={form.nombre}
                onChange={(e) =>
                  onCambiarDato("nombre", e.target.value)
                }
                autoComplete="off"
                required
              />
            </label>

            <label style={labelStyle}>
              RUT
              <input
                style={inputStyle}
                type="text"
                value={form.rut}
                onChange={(e) =>
                  onCambiarDato("rut", e.target.value)
                }
                placeholder="12.345.678-9"
                autoComplete="off"
                required
              />
            </label>

            <label style={labelStyle}>
              Edad
              <input
                style={inputStyle}
                type="number"
                min={10}
                max={110}
                value={form.edad}
                onChange={(e) =>
                  onCambiarDato("edad", e.target.value)
                }
                required
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 12,
              }}
            >
              <label style={labelStyle}>
                Dolor / región
                <input
                  style={inputStyle}
                  type="text"
                  value={form.dolor}
                  onChange={(e) =>
                    onCambiarDato("dolor", e.target.value)
                  }
                  placeholder="Rodilla / Cadera / Columna lumbar…"
                />
              </label>

              <label style={labelStyle}>
                Lado
                <input
                  style={inputStyle}
                  type="text"
                  value={form.lado}
                  onChange={(e) =>
                    onCambiarDato("lado", e.target.value)
                  }
                  placeholder="Derecha / Izquierda"
                />
              </label>
            </div>

            <label style={labelStyle}>
              Síntomas / Motivo de consulta
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                value={form.sintomas}
                onChange={(e) =>
                  onCambiarDato("sintomas", e.target.value)
                }
                placeholder="Describa brevemente el motivo de consulta, mecanismo de lesión, tiempo de evolución, etc."
              />
            </label>
          </div>

          {/* Botón para IA */}
          <div
            style={{
              marginTop: 18,
              marginBottom: 8,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleGenerarIA}
              disabled={loadingIA}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                background: theme.primary ?? "#0d2a58",
                color: "#fff",
              }}
            >
              {loadingIA ? "Llamando a IA…" : "1. Generar propuesta IA (sin pago)"}
            </button>
          </div>

          <label style={{ ...labelStyle, marginTop: 6 }}>
            Propuesta de la IA (vista previa)
            <textarea
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
              value={form.iaTexto}
              onChange={(e) =>
                onCambiarDato("iaTexto", e.target.value)
              }
              placeholder="Aquí aparecerá la propuesta de la IA. Puedes editarla si lo consideras necesario."
            />
          </label>

          <label style={{ ...labelStyle, marginTop: 12 }}>
            Comentarios / indicación del médico para el estudio
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.indicacionMedico}
              onChange={(e) =>
                onCambiarDato("indicacionMedico", e.target.value)
              }
              placeholder="Opcional: notas del médico, clasificación del caso, etc."
            />
          </label>

          <button
            type="submit"
            disabled={loadingSave}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 15,
              background: theme.accent ?? theme.primary ?? "#0072ce",
              color: "#fff",
              boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
            }}
          >
            {loadingSave
              ? "Guardando en estudio clínico…"
              : "2. Guardar caso en estudio clínico (Google Sheets)"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  fontSize: 13,
  fontWeight: 600,
  color: "#333",
  gap: 4,
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d0d7e2",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};
