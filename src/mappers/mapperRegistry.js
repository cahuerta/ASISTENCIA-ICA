// src/mappers/mapperRegistry.js
// Registro de mapeadores por zona (rodilla, mano, etc.) con carga dinámica.

const REGISTRY = new Map();

const canon = (s) => String(s || "").trim().toLowerCase();

// API
export function registerMapper(id, loader /* () => import('...') */) {
  REGISTRY.set(canon(id), loader);
}
export function hasMapper(id) {
  return REGISTRY.has(canon(id));
}
export function getLoader(id) {
  return REGISTRY.get(canon(id)) || null;
}

// Aliases desde el texto de la zona seleccionada → id del mapper
export function resolveZonaKey(zonaTexto) {
  const z = canon(zonaTexto);
  if (z.includes("rodilla")) return "rodilla";
  if (z.includes("mano"))    return "mano";
  if (z.includes("hombro"))  return "hombro";
  if (z.includes("codo"))    return "codo";
  if (z.includes("cadera"))  return "cadera";
  if (z.includes("tobillo")) return "tobillo";
  return null;
}

/* Pre-registra los mapeadores existentes. 
   Cualquier mapeador nuevo solo debe llamarse aquí con registerMapper(...)
*/
registerMapper("rodilla", () => import("../rodilla/rodilla.jsx"));
registerMapper("mano",    () => import("../mano/mano.jsx"));
registerMapper("hombro",  () => import("../hombro/hombro.jsx"));
registerMapper("codo",    () => import("../codo/codo.jsx"));
registerMapper("cadera",  () => import("../cadera/cadera.jsx"));
registerMapper("tobillo", () => import("../tobillo/tobilloypie.jsx")); // ← agregado
