// src/pie/piepuntos.js
// Puntos anatómicos clave para Pie/Tobillo derecho
// Coordenadas normalizadas (0–100) respecto a la imagen por vista.

export const PIE_PUNTOS_BY_VISTA = {
  FRONTAL: [
    { id: "fr_maleolo_medial",   nombre: "Maléolo medial",              x: 58, y: 34 },
    { id: "fr_maleolo_lateral",  nombre: "Maléolo lateral",             x: 42, y: 35 },
    { id: "fr_tibial_anterior",  nombre: "Tendón tibial anterior",      x: 52, y: 24 },
    { id: "fr_cabeza_mt1",       nombre: "Cabeza 1.º metatarsiano",     x: 63, y: 84 },
    { id: "fr_dorso_mt2",        nombre: "Dorso 2.º metatarsiano",      x: 55, y: 70 },
  ],

  POSTERIOR: [
    { id: "po_aquiles_medio",    nombre: "Aquiles (porción media)",     x: 50, y: 30 },
    { id: "po_aquiles_insercion",nombre: "Inserción calcánea de Aquiles", x: 50, y: 55 },
    { id: "po_maleolo_medial",   nombre: "Maléolo medial (posterior)",  x: 58, y: 38 },
    { id: "po_maleolo_lateral",  nombre: "Maléolo lateral (posterior)", x: 42, y: 39 },
    { id: "po_centro_talon",     nombre: "Centro del talón",            x: 50, y: 78 },
  ],

  PLANTAR: [
    { id: "pl_insercion_fascia", nombre: "Inserción fascia en calcáneo", x: 50, y: 78 },
    { id: "pl_arco_long_int",    nombre: "Arco longitudinal interno",    x: 58, y: 60 },
    { id: "pl_cabeza_mt1",       nombre: "Cabeza 1.º metatarsiano",      x: 64, y: 85 },
    { id: "pl_cabeza_mt5",       nombre: "Cabeza 5.º metatarsiano",      x: 36, y: 86 },
    { id: "pl_centro_antepie",   nombre: "Centro plantar del antepié",   x: 50, y: 88 },
  ],
};

export default PIE_PUNTOS_BY_VISTA;
