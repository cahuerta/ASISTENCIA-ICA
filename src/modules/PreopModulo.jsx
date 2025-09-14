"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { irAPagoKhipu } from "../PagoKhipu.jsx";
import FormularioComorbilidades from "../components/FormularioComorbilidades.jsx";
import { getTheme } from "../theme.js";

const T = getTheme();
const BACKEND_BASE = "https://asistencia-ica-backend.onrender.com";

/* Catálogo por zona y defaults: mismo criterio que en FormularioPaciente */
const MAP_CIRUGIAS = {
  Rodilla: [
    "Artroplastia total de rodilla (ATR)",
    "Artroscopia de rodilla",
    "Osteotomía tibial proximal",
    "Osteotomía femoral distal",
    "Cirugía menor de partes blandas",
    "Otro (especificar)",
  ],
  Cadera: [
    "Artroplastia total de cadera (ATC)",
    "Osteotomía femoral proximal (varo/valgo/derotación)",
    "Osteotomía periacetabular (PAO)",
    "Cirugía menor de partes blandas",
    "Otro (especificar)",
  ],
};
const DEFAULT_CIRUGIA = {
  Rodilla: "Artroplastia total de rodilla (ATR)",
  Cadera: "Artroplastia total de cadera (ATC)",
};

export default function PreopModulo({ initialDatos }) {
  // ===== Estados base existentes
  const [datos, setDatos] = useState(initialDatos || {});
  const [pagoRealizado, setPagoRealizado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensajeDescarga, setMensajeDescarga] = useState("");
  const pollerRef = useRef(null);

  // ===== Estados del flujo
  // pasos: 'idle' | 'comor
