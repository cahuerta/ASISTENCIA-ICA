// src/screens/PantallaTres.jsx
"use client";
import React, { useMemo, useState, useEffect } from "react";
import "../app.css";
import { getTheme } from "../theme.js";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import PreviewOrden from "../PreviewOrden.jsx";
import PreviewIA from "../PreviewIA.jsx";

const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";
const IA_SAVE_ROUTE = "/guardar-datos-ia";
const IA_PDF_ROUTE  = "/api/pdf-ia-orden";

/* helpers mínimos */
const qj = (k, f = {}) => { try { const r = sessionStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } };
const qt = (k, f = "") => { try { const r = sessionStorage.getItem(k); return r ?? f; } catch { return f; } };
const setTxt = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };
const setJson = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
const ensureIdPago = (mod) => {
  const pref = ["trauma","preop","generales","ia"].includes(mod) ? mod : "trauma";
  let id = qt("idPago", "");
  if (!id || !id.startsWith(`${pref}_`)) {
    id = `${pref}_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
    setTxt("idPago", id);
  }
  return id;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function descargaBin(url, filename) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return r;
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  return r;
}

/* ---- mappers (secciones) desde sessionStorage para trauma/IA ---- */
function leerSecciones(zonaKey, ladoFallback = "") {
  try {
    const rawExtra = sessionStorage.getItem(`${zonaKey}_seccionesExtra`);
    if (rawExtra) {
      const arr = JSON.parse(rawExtra);
      if (Array.isArray(arr) && arr.length) {
        return arr
          .filter((sec) => Array.isArray(sec?.lines) && sec.lines.length)
          .map((sec) => ({
            title: sec.title || `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${ladoFallback} — puntos marcados`,
            lines: sec.lines,
          }));
      }
    }
  } catch {}
  try {
    const rawData = sessionStorage.getItem(`${zonaKey}_data`);
    if (rawData) {
      const d = JSON.parse(rawData);
      const lines = Array.isArray(d?.puntosSeleccionados) ? d.puntosSeleccionados : [];
      if (lines.length) {
        const lado = d?.lado || ladoFallback || "";
        return [{ title: `${zonaKey[0].toUpperCase()}${zonaKey.slice(1)} ${lado} — puntos marcados`, lines }];
      }
    }
  } catch {}
  return [];
}

export default function PantallaTres({ initialDatos, moduloInicial }) {
  const T = getTheme();

  // módulo + pago ok + idPago
  const [modulo, setModulo] = useState("trauma");
  const [pagoOk, setPagoOk] = useState(false);
  const [idPago, setIdPago] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setPagoOk(p.get("pago") === "ok");
    const id = p.get("idPago") || qt("idPago", "");
    if (id) { setIdPago(id); setTxt("idPago", id); }

    let m =
      (moduloInicial && ["trauma","preop","generales","ia"].includes(moduloInicial) && moduloInicial) ||
      qt("modulo","") || (p.get("modulo") || "");
    if (!m) {
      if (id.startsWith("preop_")) m = "preop";
      else if (id.startsWith("generales_")) m = "generales";
      else if (id.startsWith("ia_")) m = "ia";
      else m = "trauma";
    }
    setModulo(m); setTxt("modulo", m);
  }, [moduloInicial]);

  // datos paciente (encabezado; los previews leen del storage)
  const datos = useMemo(() => {
    if (initialDatos) return initialDatos;
    try { const r = sessionStorage.getItem("datosPacienteJSON"); return r ? JSON.parse(r) : {}; }
    catch { return {}; }
  }, [initialDatos]);

  // secciones (mappers) para trauma/IA
  const seccionesExtra = useMemo(() => {
    if (modulo !== "trauma" && modulo !== "ia") return [];
    const lado = datos?.lado || "";
    const zonas = ["rodilla","mano","hombro","codo","tobillo"];
    const out = [];
    for (const z of zonas) {
      const secs = leerSecciones(z, lado);
      if (secs.length) out.push(...secs);
    }
    return out;
  }, [modulo, datos?.lado]);

  /* === única lógica de pago === */
  const pagar = async () => {
    const edadNum = Number(datos.edad);
    if (!datos.nombre?.trim() || !datos.rut?.trim() || !Number.isFinite(edadNum) || edadNum <= 0 || (modulo!=="ia" && !datos.genero)) {
      alert("Complete nombre, RUT, edad (>0) y género si aplica."); return;
    }
    const id = ensureIdPago(modulo);
    setTxt("modulo", modulo);
    setJson("datosPacienteJSON", { ...datos, edad: edadNum });

    const map = {
      trauma: {
        url: `${BACKEND_BASE}/guardar-datos`,
        payload: {
          idPago: id,
          datosPaciente: {
            ...datos, edad: edadNum,
            examenesIA: qj("trauma_ia_examenes", []),
            diagnosticoIA: qt("trauma_ia_diagnostico",""),
            justificacionIA: qt("trauma_ia_justificacion",""),
          },
        },
      },
      preop: {
        url: `${BACKEND_BASE}/guardar-datos-preop`,
        payload: {
          idPago: id,
          datosPaciente: { ...datos, edad: edadNum },
          comorbilidades: qj("preop_comorbilidades_data", qj("preop_comorbilidades", {})),
          tipoCirugia: qt("preop_tipoCirugia", qt("preop_tipo_cirugia","")),
          examenesIA: qj("preop_ia_examenes", []),
          informeIA: qt("preop_ia_resumen",""),
          nota: qt("preop_nota",""),
        },
      },
      generales: {
        url: `${BACKEND_BASE}/guardar-datos-generales`,
        payload: {
          idPago: id,
          datosPaciente: { ...datos, edad: edadNum },
          comorbilidades: qj("generales_comorbilidades_data", {}),
          examenesIA: qj("generales_ia_examenes", []),
          informeIA: qt("generales_ia_resumen",""),
        },
      },
      ia: {
        url: `${BACKEND_BASE}${IA_SAVE_ROUTE}`,
        payload: {
          idPago: id,
          datosPaciente: { ...datos, edad: edadNum },
          examenesIA: qj("ia_examenes", qj("trauma_ia_examenes", [])),
          nota: qt("ia_nota", qt("trauma_ia_justificacion","")),
        },
      },
    };

    try {
      const cfg = map[modulo] || map.trauma;
      await fetch(cfg.url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(cfg.payload) });
      await irAPagoKhipu({ ...datos, edad: edadNum }, { idPago: id, modulo });
    } catch (e) {
      console.error(e); alert("No se pudo generar el link de pago.");
    }
  };

  /* === única lógica de descarga === */
  const descargar = async () => {
    const id = idPago || qt("idPago","");
    if (!id) return alert("ID de pago no encontrado");
    const base = (datos?.nombre || "paciente").replace(/ /g,"_");
    const url =
      modulo === "trauma"    ? `${BACKEND_BASE}/pdf/${id}` :
      modulo === "preop"     ? `${BACKEND_BASE}/pdf-preop/${id}` :
      modulo === "generales" ? `${BACKEND_BASE}/pdf-generales/${id}` :
                               `${BACKEND_BASE}${IA_PDF_ROUTE}/${id}`;
    const filename =
      modulo === "trauma"    ? `orden_${base}.pdf` :
      modulo === "preop"     ? `preop_${base}.pdf` :
      modulo === "generales" ? `generales_${base}.pdf` :
                               `ordenIA_${base}.pdf`;

    for (let i=0;i<5;i++) {
      const res = await descargaBin(url, filename);
      if (res?.ok) return;
      if (res?.status === 402) { await sleep(1200); continue; }
      alert("No se pudo descargar el PDF."); return;
    }
    alert("El pago aún no se confirma.");
  };

  /* === Render: PreviewOrden y PreviewIA SIEMPRE visibles === */
  return (
    <div className="app" style={{ "--primary": T.primary }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <h2 style={{ margin: 0 }}>Vista previa</h2>

        {/* PreviewOrden ahora para TODOS los módulos; mappers en trauma/IA via seccionesExtra */}
        <PreviewOrden
          scope={modulo}
          datos={datos}
          seccionesExtra={seccionesExtra}
        />

        {/* PreviewIA SIEMPRE visible (como indicaste) */}
        <PreviewIA />

        {/* Acciones */}
        {!pagoOk ? (
          <button className="btn primary" onClick={pagar} style={{ marginTop: 12 }}>
            Pagar
          </button>
        ) : (
          <button className="btn primary" onClick={descargar} style={{ marginTop: 12 }}>
            Descargar PDF
          </button>
        )}
      </div>
    </div>
  );
}
