// src/cadera/caderapuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.

export const CADERA_PUNTOS_ANTERIOR = [
  { key: "eias",             x: 0.35, y: 0.25, label: "Espina ilíaca anterosuperior (EIAS)" },
  { key: "region_inguinal",  x: 0.55, y: 0.45, label: "Región inguinal (iliopsoas)" },
  { key: "trocanter_mayor",  x: 0.30, y: 0.70, label: "Trocánter mayor" },
  { key: "aductores_pubis",  x: 0.40, y: 0.48, label: "Origen aductores (pubis)" },
  { key: "sinfisis_pubica",  x: 0.70, y: 0.50, label: "Sínfisis púbica" },
];

export const CADERA_PUNTOS_POSTERIOR = [
  { key: "sacroiliaca",          x: 0.37, y: 0.35, label: "Articulación sacroilíaca" },
  { key: "bursa_trocanterica",   x: 0.70, y: 0.58, label: "Bursa trocantérica" },
  { key: "piriforme",            x: 0.62, y: 0.48, label: "Piriforme" },
  { key: "isquiotibiales_prox",  x: 0.38, y: 0.79, label: "Tendones isquiotibiales proximales" },
];

export const CADERA_PUNTOS_BY_VISTA = {
  anterior:  CADERA_PUNTOS_ANTERIOR,
  frontal:   CADERA_PUNTOS_ANTERIOR, // alias
  posterior: CADERA_PUNTOS_POSTERIOR,
};

export const CADERA_PUNTOS = [
  ...CADERA_PUNTOS_ANTERIOR,
  ...CADERA_PUNTOS_POSTERIOR,
];

export const CADERA_LABELS = Object.fromEntries(
  CADERA_PUNTOS.map(({ key, label }) => [key, label])
);
