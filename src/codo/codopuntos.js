// src/codo/codopuntos.js
// Puntos predispuestos (x,y normalizados). 3 por vista.
// Vista: frontal / posterior (igual que otros módulos).

export const CODO_PUNTOS_FRONTAL = [
  { key: "epicondilo_medial",  x: 0.68, y: 0.40, label: "Epicóndilo medial" },
  { key: "epicondilo_lateral", x: 0.22, y: 0.40, label: "Epicóndilo lateral" },
  { key: "tendon_biceps",      x: 0.50, y: 0.37, label: "Tendón del bíceps" },
];

export const CODO_PUNTOS_POSTERIOR = [
  { key: "epicondilo_medial_post",  x: 0.16, y: 0.50, label: "Epicóndilo medial (post.)" },
  { key: "epicondilo_lateral_post", x: 0.74, y: 0.45, label: "Epicóndilo lateral (post.)" },
  { key: "tendon_triceps",          x: 0.40, y: 0.50, label: "Tendón del tríceps" },
];

export const CODO_PUNTOS_BY_VISTA = {
  frontal: CODO_PUNTOS_FRONTAL,
  posterior: CODO_PUNTOS_POSTERIOR,
};

// Lista plana (si te sirve)
export const CODO_PUNTOS = [
  ...CODO_PUNTOS_FRONTAL,
  ...CODO_PUNTOS_POSTERIOR,
];

// Mapa rápido: key → label
export const CODO_LABELS = Object.fromEntries(
  CODO_PUNTOS.map(({ key, label }) => [key, label])
);
