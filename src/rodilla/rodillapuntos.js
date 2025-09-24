// src/rodilla/rodillapuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.

export const RODILLA_PUNTOS_FRENTE = [
  { key: "rotula", x: 0.50, y: 0.42 },
  { key: "interlinea_medial", x: 0.44, y: 0.52 },
  { key: "interlinea_lateral", x: 0.56, y: 0.52 },
  { key: "tendon_rotuliano", x: 0.50, y: 0.62 },
  { key: "tuberosidad_anterior_tibial", x: 0.50, y: 0.78 },
  { key: "retinaculo_medial", x: 0.40, y: 0.45 },
  { key: "retinaculo_lateral", x: 0.60, y: 0.45 },
  { key: "pes_anserina", x: 0.43, y: 0.84 },
  { key: "tracto_iliotibial", x: 0.64, y: 0.68 },
];

export const RODILLA_PUNTOS_POSTERIOR = [
  { key: "fosa_poplitea", x: 0.50, y: 0.48 },
  { key: "interlinea_medial_posterior", x: 0.44, y: 0.53 },
  { key: "interlinea_lateral_posterior", x: 0.56, y: 0.53 },
  { key: "biceps_femoral", x: 0.62, y: 0.60 },
  { key: "gastrocnemios", x: 0.50, y: 0.70 },
];

export const RODILLA_PUNTOS_LATERAL = [
  { key: "tendon_rotuliano", x: 0.52, y: 0.60 },
  { key: "tuberosidad_tibial", x: 0.55, y: 0.78 },
  { key: "rotula", x: 0.50, y: 0.42 },
  { key: "cuadriceps", x: 0.52, y: 0.30 },
  { key: "gastrocnemios", x: 0.45, y: 0.72 },
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
