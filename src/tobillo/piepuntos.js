// src/pie/piepuntos.js
// Puntos predispuestos (x,y normalizados). SIN textos en PNG/SVG, solo pins.
// Se agrega `label` (nombre coloquial) para usar directo en resúmenes.

// ==== VISTA FRENTE (DORSAL) ====
export const PIE_PUNTOS_FRENTE = [
  { key: "fr_maleolo_medial",  x: 0.65, y: 0.39, label: "Maléolo medial" },
  { key: "fr_maleolo_lateral", x: 0.28, y: 0.42, label: "Maléolo lateral" },
  { key: "fr_tibial_ant",      x: 0.55, y: 0.39, label: "Tendón tibial anterior" },
  { key: "fr_cabeza_mt1",      x: 0.65, y: 0.95, label: "Cabeza 1.º metatarsiano" },
  { key: "fr_dorso_mt2",       x: 0.48, y: 0.96, label: "Dorso 2.º metatarsiano" },
];

// ==== VISTA POSTERIOR ====
export const PIE_PUNTOS_POSTERIOR = [
  { key: "po_aquiles_medio", x: 0.55, y: 0.50, label: "Aquiles (porción media)" },
  { key: "po_aquiles_ins",   x: 0.55, y: 0.85, label: "Inserción calcánea de Aquiles" },
  { key: "po_maleolo_med",   x: 0.68, y: 0.48, label: "Maléolo medial (posterior)" },
  { key: "po_maleolo_lat",   x: 0.32, y: 0.54, label: "Maléolo lateral (posterior)" },
  { key: "po_centro_talon",  x: 0.45, y: 0.98, label: "Centro del talón" },
];

// ==== VISTA PLANTAR ====
export const PIE_PUNTOS_PLANTAR = [
  { key: "pl_ins_fascia",     x: 0.40, y: 0.25, label: "Inserción fascia en calcáneo" },
  { key: "pl_arco_long_int",  x: 0.58, y: 0.60, label: "Arco longitudinal interno" },
  { key: "pl_cabeza_mt1",     x: 0.66, y: 0.82, label: "Cabeza 1.º metatarsiano" },
  { key: "pl_cabeza_mt5",     x: 0.26, y: 0.80, label: "Cabeza 5.º metatarsiano" },
  { key: "pl_centro_antepie", x: 0.45, y: 0.83, label: "Centro plantar del antepié" },
];

// ==== BY_VISTA (mismo patrón que rodilla) ====
export const PIE_PUNTOS_BY_VISTA = {
  frente: PIE_PUNTOS_FRENTE,
  posterior: PIE_PUNTOS_POSTERIOR,
  plantar: PIE_PUNTOS_PLANTAR,
};

// Lista plana (si te sirve)
export const PIE_PUNTOS = [
  ...PIE_PUNTOS_FRENTE,
  ...PIE_PUNTOS_POSTERIOR,
  ...PIE_PUNTOS_PLANTAR,
];

// Mapa rápido: key → label (para usar en resúmenes)
export const PIE_LABELS = Object.fromEntries(
  PIE_PUNTOS.map(({ key, label }) => [key, label])
);

export default PIE_PUNTOS_BY_VISTA;
