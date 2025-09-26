// src/rodilla/rodillapuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.
// Se agrega `label` (nombre coloquial) para usar directo en resúmenes.

export const RODILLA_PUNTOS_FRENTE = [
  { key: "rotula", x: 0.50, y: 0.50, label: "Rótula" },
  { key: "interlinea_medial", x: 0.68, y: 0.65, label: "Interlínea medial" },
  { key: "interlinea_lateral", x: 0.30, y: 0.65, label: "Interlínea lateral" },
  { key: "tendon_rotuliano", x: 0.50, y: 0.67, label: "Tendón rotuliano" },
  { key: "tuberosidad_anterior_tibial", x: 0.50, y: 0.85, label: "Tuberosidad anterior tibial" },
  { key: "retinaculo_medial", x: 0.70, y: 0.35, label: "Retináculo medial" },
  { key: "retinaculo_lateral", x: 0.30, y: 0.35, label: "Retináculo lateral" },
  { key: "pes_anserina", x: 0.64, y: 0.95, label: "Pes anserina" },
  { key: "tracto_iliotibial", x: 0.20, y: 0.75, label: "Tracto iliotibial" },
];

export const RODILLA_PUNTOS_POSTERIOR = [
  { key: "fosa_poplitea", x: 0.50, y: 0.45, label: "Fosa poplítea" },
  { key: "interlinea_medial_posterior", x: 0.40, y: 0.50, label: "Interlínea medial (posterior)" },
  { key: "interlinea_lateral_posterior", x: 0.60, y: 0.50, label: "Interlínea lateral (posterior)" },
  { key: "biceps_femoral", x: 0.62, y: 0.30, label: "Bíceps femoral" },
  { key: "gastrocnemios", x: 0.50, y: 0.70, label: "Gastrocnemios" },
];

export const RODILLA_PUNTOS_LATERAL = [
  { key: "tendon_rotuliano", x: 0.15, y: 0.50, label: "Tendón rotuliano" },
  { key: "tuberosidad_tibial", x: 0.17, y: 0.70, label: "Tuberosidad tibial" },
  { key: "rotula", x: 0.15, y: 0.30, label: "Rótula" },
  { key: "cuadriceps", x: 0.52, y: 0.1, label: "Cuádriceps" },
  { key: "gastrocnemios", x: 0.60, y: 0.65, label: "Gastrocnemios" },
];

export const RODILLA_PUNTOS_BY_VISTA = {
  frente: RODILLA_PUNTOS_FRENTE,
  posterior: RODILLA_PUNTOS_POSTERIOR,
  lateral: RODILLA_PUNTOS_LATERAL,
};

// Lista plana (si te sirve)
export const RODILLA_PUNTOS = [
  ...RODILLA_PUNTOS_FRENTE,
  ...RODILLA_PUNTOS_POSTERIOR,
  ...RODILLA_PUNTOS_LATERAL,
];

// Mapa rápido: key → label (para usar en resúmenes)
export const RODILLA_LABELS = Object.fromEntries(
  RODILLA_PUNTOS.map(({ key, label }) => [key, label])
);
