// src/rodilla/rodillapuntos.js
// Solo los puntos solicitados, organizados por vista.

export const RODILLA_PUNTOS_FRENTE = [
  { key: "rotula", label: "Rótula" },
  { key: "interlinea_medial", label: "Interlínea medial" },
  { key: "interlinea_lateral", label: "Interlínea lateral" },
  { key: "tendon_rotuliano", label: "Tendón rotuliano" },
  { key: "tuberosidad_tibial_anterior", label: "Tuberosidad anterior tibial" },
  { key: "retinaculo_medial", label: "Retináculo medial" },
  { key: "retinaculo_lateral", label: "Retináculo lateral" },
  { key: "pes_anserina", label: "Pes anserina" },
  { key: "tracto_iliotibial", label: "Tracto iliotibial" },
];

export const RODILLA_PUNTOS_POSTERIOR = [
  { key: "fosa_poplitea", label: "Fosa poplítea" },
  { key: "interlinea_medial_posterior", label: "Interlínea medial (posterior)" },
  { key: "interlinea_lateral_posterior", label: "Interlínea lateral (posterior)" },
  { key: "biceps_femoral", label: "Bíceps femoral" },
  { key: "gastrocnemios", label: "Gastrocnemios" },
];

export const RODILLA_PUNTOS_LATERAL = [
  { key: "tendon_rotuliano", label: "Tendón rotuliano" },
  { key: "tuberosidad_tibial", label: "Tuberosidad tibial" },
  { key: "rotula", label: "Rótula" },
  { key: "cuadriceps", label: "Cuádriceps" },
  { key: "gastrocnemios", label: "Gastrocnemios" },
];

// Acceso por vista
export const RODILLA_PUNTOS_BY_VISTA = {
  frente: RODILLA_PUNTOS_FRENTE,
  posterior: RODILLA_PUNTOS_POSTERIOR,
  lateral: RODILLA_PUNTOS_LATERAL,
};

// (Opcional) Lista plana si la necesitas en algún selector global.
export const RODILLA_PUNTOS = [
  ...RODILLA_PUNTOS_FRENTE,
  ...RODILLA_PUNTOS_POSTERIOR,
  ...RODILLA_PUNTOS_LATERAL,
];
