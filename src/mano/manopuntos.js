// src/mano/manopuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.
// Compatible con el esquema usado en rodilla_*: arrays por vista, lista plana y mapa key→label.
// Vista actual: PALMAR. (Dorsal se puede completar después).

export const MANO_PUNTOS_PALMAR = [
  // Pulgar (sin yema; mantener IP y base CMC)
  { key: "pulgar_ip", x: 0.22, y: 0.42, label: "Pulgar IP" },
  { key: "pulgar_cmc", x: 0.25, y: 0.72, label: "Pulgar base CMC" },

  // Índice (2): IFP, IFD
  { key: "indice_ifd", x: 0.38, y: 0.20, label: "Índice IFD (DIP)" },
  { key: "indice_ifp", x: 0.38, y: 0.32, label: "Índice IFP (PIP)" },
  // A1 (solo 2–5)
  { key: "a1_indice", x: 0.40, y: 0.62, label: "Polea A1 índice" },

  // Medio (3): IFP, IFD
  { key: "medio_ifd", x: 0.52, y: 0.16, label: "Medio IFD (DIP)" },
  { key: "medio_ifp", x: 0.52, y: 0.29, label: "Medio IFP (PIP)" },
  { key: "a1_medio", x: 0.52, y: 0.60, label: "Polea A1 medio" },

  // Anular (4): IFP, IFD
  { key: "anular_ifd", x: 0.66, y: 0.18, label: "Anular IFD (DIP)" },
  { key: "anular_ifp", x: 0.66, y: 0.31, label: "Anular IFP (PIP)" },
  { key: "a1_anular", x: 0.64, y: 0.62, label: "Polea A1 anular" },

  // Meñique (5): IFP, IFD
  { key: "menique_ifd", x: 0.80, y: 0.22, label: "Meñique IFD (DIP)" },
  { key: "menique_ifp", x: 0.80, y: 0.34, label: "Meñique IFP (PIP)" },
  { key: "a1_menique", x: 0.78, y: 0.64, label: "Polea A1 meñique" },

  // Palma / Carpo (mantener, sin muñeca palmar ósea)
  { key: "palma_tenar", x: 0.32, y: 0.66, label: "Eminencia tenar" },
  { key: "palma_hipotenar", x: 0.84, y: 0.70, label: "Eminencia hipotenar" },
  { key: "tunel_carpiano", x: 0.54, y: 0.80, label: "Túnel carpiano" },
  { key: "canal_guyon", x: 0.90, y: 0.82, label: "Canal de Guyon" },
];

// Placeholder para compatibilidad si tu componente espera ambas vistas
export const MANO_PUNTOS_DORSAL = [];

export const MANO_PUNTOS_BY_VISTA = {
  palmar: MANO_PUNTOS_PALMAR,
  dorsal: MANO_PUNTOS_DORSAL,
};

// Lista plana (si te sirve)
export const MANO_PUNTOS = [
  ...MANO_PUNTOS_PALMAR,
  ...MANO_PUNTOS_DORSAL,
];

// Mapa rápido: key → label (para usar en resúmenes)
export const MANO_LABELS = Object.fromEntries(
  MANO_PUNTOS.map(({ key, label }) => [key, label])
);
