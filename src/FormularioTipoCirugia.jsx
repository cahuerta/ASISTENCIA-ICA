// src/FormularioTipoCirugia.jsx
"use client";
import React, { useState, useEffect, useMemo } from "react";

/* ============ Tipos de cirugía (filtrados por zona) ============ */
function cirugiasParaZona(dolor = "") {
  const s = (dolor || "").toLowerCase();
  if (s.includes("cadera")) {
    return [
      "ARTROPLASTIA TOTAL DE CADERA (ATC)",
      "ARTROSCOPIA DE CADERA",
      "OSTEOTOMÍA DE CADERA",
      "CIRUGÍA MENOR DE PARTES BLANDAS",
      "OTRO (ESPECIFICAR)",
    ];
  }
  if (s.includes("rodilla")) {
    return [
      "ARTROPLASTIA TOTAL DE RODILLA (ATR)",
      "ARTROSCOPIA DE RODILLA",
      "OSTEOTOMÍA DE RODILLA",
      "CIRUGÍA MENOR DE PARTES BLANDAS",
      "OTRO (ESPECIFICAR)",
    ];
  }
  return ["OTRO (ESPECIFICAR)"];
}

function FormularioTipoCirugia({ datos, onTipoCirugiaChange }) {
  // Estado local + persistencia
  const [tipoCirugia, setTipoCirugia] = useState(() => {
    try {
      return sessionStorage.getItem("preop_tipoCirugia") || "";
    } catch {
      return "";
    }
  });

  const [tipoCirugiaLibre, setTipoCirugiaLibre] = useState(() => {
    try {
      return sessionStorage.getItem("preop_tipoCirugia_otro") || "";
    } catch {
      return "";
    }
  });

  const opcionesCirugia = useMemo(
    () => cirugiasParaZona(datos?.dolor || ""),
    [datos?.dolor]
  );

  // Asegurar que la selección siga siendo válida si cambia el dolor
  useEffect(() => {
    if (!opcionesCirugia.includes(tipoCirugia)) {
      setTipoCirugia("");
    }
  }, [opcionesCirugia, tipoCirugia]);

  // Guardar en sessionStorage y notificar al padre
  useEffect(() => {
    try {
      sessionStorage.setItem("preop_tipoCirugia", tipoCirugia || "");
    } catch {}
    onTipoCirugiaChange?.(tipoCirugia, tipoCirugiaLibre);
  }, [tipoCirugia]);

  useEffect(() => {
    try {
      sessionStorage.setItem("preop_tipoCirugia_otro", tipoCirugiaLibre || "");
    } catch {}
    onTipoCirugiaChange?.(tipoCirugia, tipoCirugiaLibre);
  }, [tipoCirugiaLibre]);

  return (
    <div>
      <label>TIPO DE CIRUGÍA:</label>
      <select
        value={tipoCirugia}
        onChange={(e) => setTipoCirugia(e.target.value)}
        required
      >
        <option value="">Seleccione…</option>
        {opcionesCirugia.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {tipoCirugia === "OTRO (ESPECIFICAR)" && (
        <input
          placeholder="Especifique el tipo de cirugía"
          value={tipoCirugiaLibre}
          onChange={(e) => setTipoCirugiaLibre(e.target.value)}
          required
        />
      )}
    </div>
  );
}

export default FormularioTipoCirugia;
