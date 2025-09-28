// src/mano/manopuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.
// Patrón compatible con rodillapuntos.js: arrays por vista, lista plana y mapa key→label.
// Nota: coordenadas pensadas para MANO DERECHA en vista ortogonal; para izquierda puedes espejar en UI.

export const MANO_PUNTOS_PALMAR = [
  // Pulgar (sin yema; mantener IP y base CMC)
  { key: "pulgar_ip", x: 0.18, y: 0.40, label: "Pulgar IP" },
  { key: "pulgar_cmc", x: 0.27, y: 0.53, label: "Pulgar A1" },

  // Índice (2): IFP, IFD + polea A1
  { key: "indice_ifd", x: 0.36, y: 0.13, label: "Índice IFD (DIP)" },
  { key: "indice_ifp", x: 0.36, y: 0.22, label: "Índice IFP (PIP)" },
  { key: "a1_indice",  x: 0.40, y: 0.41, label: "Polea A1 índice" },

  // Medio (3): IFP, IFD + polea A1
  { key: "medio_ifd", x: 0.50, y: 0.10, label: "Medio IFD (DIP)" },
  { key: "medio_ifp", x: 0.50, y: 0.20, label: "Medio IFP (PIP)" },
  { key: "a1_medio",  x: 0.50, y: 0.38, label: "Polea A1 medio" },

  // Anular (4): IFP, IFD + polea A1
  { key: "anular_ifd", x: 0.64, y: 0.14, label: "Anular IFD (DIP)" },
  { key: "anular_ifp", x: 0.63, y: 0.23, label: "Anular IFP (PIP)" },
  { key: "a1_anular",  x: 0.61, y: 0.40, label: "Polea A1 anular" },

  // Meñique (5): IFP, IFD + polea A1
  { key: "menique_ifd", x: 0.77, y: 0.24, label: "Meñique IFD (DIP)" },
  { key: "menique_ifp", x: 0.75, y: 0.31, label: "Meñique IFP (PIP)" },
  { key: "a1_menique",  x: 0.70, y: 0.45, label: "Polea A1 meñique" },

  // Palma / Carpo (mantener; SIN "muñeca palmar" ósea)
  { key: "palma_tenar",     x: 0.38, y: 0.62, label: "Eminencia tenar" },
  { key: "palma_hipotenar", x: 0.60, y: 0.65, label: "Eminencia hipotenar" },
  { key: "tunel_carpiano",  x: 0.48, y: 0.75, label: "Túnel carpiano" },
  { key: "canal_guyon",     x: 0.62, y: 0.78, label: "Canal de Guyon" },
];

export const MANO_PUNTOS_DORSAL = [
  // Pulgar (sin yema; mantener IP y base CMC)
  { key: "pulgar_ip",  x: 0.18, y: 0.42, label: "Pulgar IP" },
  { key: "pulgar_cmc", x: 0.23, y: 0.72, label: "Pulgar base CMC" },

  // Dedos 2–5: IFP (PIP) e IFD (DIP) — sin MCP
  { key: "indice_ifd",  x: 0.36, y: 0.15, label: "Índice IFD (DIP)" },
  { key: "indice_ifp",  x: 0.36, y: 0.20, label: "Índice IFP (PIP)" },

  { key: "medio_ifd",   x: 0.50, y: 0.13, label: "Medio IFD (DIP)" },
  { key: "medio_ifp",   x: 0.50, y: 0.23, label: "Medio IFP (PIP)" },

  { key: "anular_ifd",  x: 0.64, y: 0.15, label: "Anular IFD (DIP)" },
  { key: "anular_ifp",  x: 0.64, y: 0.25, label: "Anular IFP (PIP)" },

  { key: "menique_ifd", x: 0.80, y: 0.23, label: "Meñique IFD (DIP)" },
  { key: "menique_ifp", x: 0.78, y: 0.32, label: "Meñique IFP (PIP)" },

  // Carpo/Muñeca dorsal (landmarks y compartimentos extensores)
  { key: "dorso_tabaquera", x: 0.30, y: 0.72, label: "Tabaquera anatómica" },
  { key: "dorso_SL",        x: 0.55, y: 0.68, label: "Intervalo escafolunar (SL)" },
  { key: "dorso_lister",    x: 0.50, y: 0.75, label: "Tubérculo de Lister" },

  { key: "dorso_comp1",     x: 0.26, y: 0.66, label: "Compartimento 1 (APL/EPB)" },
  { key: "dorso_comp2",     x: 0.36, y: 0.66, label: "Compartimento 2 (ECRL/ECRB)" },
  { key: "dorso_comp4",     x: 0.58, y: 0.66, label: "Compartimento 4 (EDC/EIP)" },
  { key: "dorso_comp5",     x: 0.72, y: 0.66, label: "Compartimento 5 (EDM)" },
  { key: "dorso_ecu_surco", x: 0.86, y: 0.68, label: "Surco ECU (comp. 6)" },

  { key: "dorso_tfcc",      x: 0.90, y: 0.74, label: "Fóvea ulnar / TFCC dorsal" },
  { key: "dorso_boss",      x: 0.48, y: 0.60, label: "Boss carpiano (base 2.º–3.º MC)" },
];

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
