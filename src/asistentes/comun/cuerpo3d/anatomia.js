// src/asistentes/comun/cuerpo3d/anatomia.js
// Qué parte del cuerpo es un punto de la piel del modelo 3D.
// Coordenadas del modelo: pies en y=0, derecha del paciente = x negativa, frente = z positiva.
// J = articulaciones del modelo elegido (articulaciones.json: hombre / mujer).
import { Vector3 } from "three";

const LADO = { r: "derecho", l: "izquierdo" };
const LADA = { r: "derecha", l: "izquierda" };

function distSeg(p, a, b) {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return { d: p.distanceTo(a.clone().addScaledVector(ab, t)), t };
}

export function crearAnatomia(J) {
  const V = (k) => new Vector3(...J[k]);
  const partes = (s) => ({
    articulaciones: [
      { z: "hombro", p: V(s + "-shoulder"), r: 0.62, f: "m" },
      { z: "codo", p: V(s + "-elbow"), r: 0.58, f: "m" },
      { z: "muñeca", p: V(s + "-hand"), r: 0.44, f: "f" },
      { z: "rodilla", p: V(s + "-knee"), r: 0.72, f: "f" },
      { z: "tobillo", p: V(s + "-ankle"), r: 0.58, f: "m" },
    ],
    segmentos: [
      { z: "brazo", a: V(s + "-shoulder"), b: V(s + "-elbow"), f: "m" },
      { z: "antebrazo", a: V(s + "-elbow"), b: V(s + "-hand"), f: "m" },
      { z: "mano", a: V(s + "-hand"), b: V(s + "-finger-3-4"), f: "f" },
      { z: "muslo", a: V(s + "-upper-leg"), b: V(s + "-knee"), f: "m" },
      { z: "pierna", a: V(s + "-knee"), b: V(s + "-ankle"), f: "f" },
      { z: "pie", a: V(s + "-ankle"), b: V(s + "-foot-2"), f: "m" },
    ],
  });
  const ANAT = { r: partes("r"), l: partes("l") };
  const TRONCO = { a: V("neck"), b: V("pelvis") };
  const yPelvis = J.pelvis[1], yLumbar = J["spine-2"][1], yDorsal = J["spine-1"][1];
  const yCuello = J.neck[1] - 0.15, yCabeza = J.head[1] - 0.2;
  const cap = (z) => z[0].toUpperCase() + z.slice(1);

  /** { clave, zona, det } del punto p (normal n) */
  return function clasificar(p, n) {
    const s = p.x < 0 ? "r" : "l";
    if (p.y > yCabeza && Math.abs(p.x) < 1.2) return { clave: "cabeza", zona: "Cabeza", det: "" };
    if (p.y > yCuello && Math.abs(p.x) < 1.0) {
      return n.z < 0 ? { clave: "cervical", zona: "Columna cervical", det: "" } : { clave: "cuello", zona: "Cuello", det: "" };
    }
    const A = ANAT[s];
    let mejor = null;
    for (const j of A.articulaciones) {
      const d = p.distanceTo(j.p) / j.r;
      if (d < 1 && (!mejor || d < mejor.d)) mejor = { d, j };
    }
    const cad = V(s + "-upper-leg");
    const enPelvis = p.y < yPelvis + 0.35 && p.y > cad.y - 1.1 && Math.abs(p.x) < 2.0;
    if (enPelvis && !mejor) {
      if (n.z < -0.35) return { clave: s + "-gluteo", zona: "Glúteo " + LADO[s], det: "" };
      if (Math.abs(p.x) < 0.35) return { clave: "pubis", zona: n.z < 0 ? "Sacro" : "Pubis", det: "" };
      return { clave: s + "-cadera", zona: "Cadera " + LADA[s], det: "" };
    }
    if (mejor) {
      const z = mejor.j.z;
      return { clave: s + "-" + z, zona: cap(z) + " " + (mejor.j.f === "f" ? LADA[s] : LADO[s]), det: "" };
    }
    let seg = null;
    for (const g of A.segmentos) {
      const r = distSeg(p, g.a, g.b);
      if (!seg || r.d < seg.d) seg = { ...r, g };
    }
    const tr = distSeg(p, TRONCO.a, TRONCO.b);
    if (tr.d * 0.55 < seg.d || (Math.abs(p.x) < 1.15 && p.y > yPelvis)) {
      const atras = n.z < -0.2;
      if (p.y < yPelvis + 0.35) return { clave: "pelvis", zona: atras ? "Sacro" : "Pelvis", det: "" };
      if (p.y < yLumbar) return atras ? { clave: "lumbar", zona: "Columna lumbar", det: "" } : { clave: "abdomen", zona: "Abdomen", det: "" };
      if (p.y < yDorsal) return atras ? { clave: "dorsal", zona: "Columna dorsal", det: "" } : { clave: "abdomen-alto", zona: "Abdomen", det: "" };
      if (atras) return Math.abs(p.x) > 0.6 ? { clave: s + "-escapula", zona: "Escápula " + LADA[s], det: "" } : { clave: "dorsal", zona: "Columna dorsal", det: "" };
      return { clave: "torax", zona: "Tórax", det: "" };
    }
    const z = seg.g.z;
    return { clave: s + "-" + z, zona: cap(z) + " " + (seg.g.f === "f" ? LADA[s] : LADO[s]), det: "" };
  };
}

// Zona de Ipo (las mismas de bancoPreguntas.js) según la parte tocada; null si Ipo no la atiende
const A_ZONA = {
  rodilla: "Rodilla", cadera: "Cadera", gluteo: "Cadera", hombro: "Hombro", codo: "Codo",
  "muñeca": "Mano", mano: "Mano", tobillo: "Tobillo", pie: "Tobillo",
  lumbar: "Columna lumbar", pelvis: "Columna lumbar", dorsal: "Columna dorsal", escapula: "Columna dorsal",
  cervical: "Columna cervical",
};
export function zonaIpo(clave) {
  return A_ZONA[String(clave).replace(/^[rl]-/, "")] || null;
}
export const ladoDe = (clave) => (clave.startsWith("r-") ? "Derecha" : clave.startsWith("l-") ? "Izquierda" : "");

// Partes del modelo que pertenecen a una zona de Ipo (para pintarla)
export function clavesDeZona(zona, lado) {
  const s = lado === "Izquierda" ? "l-" : "r-";
  const m = {
    "Rodilla": [s + "rodilla"], "Cadera": [s + "cadera", s + "gluteo"], "Hombro": [s + "hombro"], "Codo": [s + "codo"],
    "Mano": [s + "muñeca", s + "mano"], "Tobillo": [s + "tobillo", s + "pie"],
    "Columna lumbar": ["lumbar", "pelvis"], "Columna dorsal": ["dorsal", "r-escapula", "l-escapula"], "Columna cervical": ["cervical"],
  };
  return m[zona] || [];
}
