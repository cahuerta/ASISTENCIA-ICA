// src/hombro/hombropuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.
// Patrón compatible con rodillapuntos.js y manopuntos.js: arrays por vista,
// lista plana y mapa key→label.
// Nota: coordenadas tentativas pensadas para hombro en vista ortogonal;
// la UI puede espejar según lateralidad (izquierda/derecha).

/* =========================
   Vista ANTERIOR (6 puntos)
   ========================= */
export const HOMBRO_PUNTOS_ANTERIOR = [
  // 1) Articulación acromioclavicular (AC)
  { key: "acromioclavicular", x: 0.30, y: 0.30, label: "Articulación acromioclavicular" },

  // 2) Espacio subacromial (anterior)
  { key: "subacromial_ant", x: 0.15, y: 0.40, label: "Espacio subacromial" },

  // 3) Surco bicipital (PLB)
  { key: "surco_bicipital", x: 0.25, y: 0.90, label: "Surco bicipital (PLB)" },

  // 4) Apófisis coracoides
  { key: "coracoides", x: 0.36, y: 0.40, label: "Apófisis coracoides" },

  // 5) Tubérculo mayor / footprint supraespinoso
  { key: "tuberculo_mayor", x: 0.10, y: 0.45, label: "Trocanter mayor" },

  // 6) Surco deltopectoral (región)
  { key: "surco_deltopectoral", x: 0.44, y: 0.54, label: "Surco deltopectoral" },
];

/* ==========================
   Vista POSTERIOR (4 puntos)
   ========================== */
export const HOMBRO_PUNTOS_POSTERIOR = [
  // 1) Línea articular glenohumeral posterior
  { key: "gh_posterior_linea", x: 0.30, y: 0.38, label: "Gleno humeral" },

  // 2) Supraespinoso (footprint)
  { key: "supraespinoso", x: 0.45, y: 0.27, label: "Supraespinoso" },

  // 3) Infraespinoso (vientre)
  { key: "infraespinoso_footprint", x: 0.44, y: 0.35, label: "Infraespinoso" },

  // 4) Subacromial posterior
  { key: "subacromial_post", x: 0.35, y: 0.30, label: "Espacio subacromial" },
];

/* ==============
   Por cada vista
   ============== */
export const HOMBRO_PUNTOS_BY_VISTA = {
  anterior:  HOMBRO_PUNTOS_ANTERIOR,
  frontal:   HOMBRO_PUNTOS_ANTERIOR, // alias para compatibilidad con hombro.jsx
  posterior: HOMBRO_PUNTOS_POSTERIOR,
};

/* ===========
   Lista plana
   =========== */
export const HOMBRO_PUNTOS = [
  ...HOMBRO_PUNTOS_ANTERIOR,
  ...HOMBRO_PUNTOS_POSTERIOR,
];

/* ============================
   Mapa rápido: key → label
   ============================ */
export const HOMBRO_LABELS = Object.fromEntries(
  HOMBRO_PUNTOS.map(({ key, label }) => [key, label])
);
