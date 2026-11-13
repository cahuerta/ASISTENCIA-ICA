// src/asistentes/comun/cuerpo3d/estructuras.js
// Qué estructura tocó el paciente en el atlas (piel, músculo o hueso) y dónde exactamente,
// para darle a la IA más información del lugar del dolor.
// Todo en coordenadas del modelo del lado DERECHO (el izquierdo es su espejo):
// x negativa = lateral, x hacia 0 = medial, y arriba, z adelante.
// J = articulaciones del atlas (atlas.json, claves "r-...").
import { Vector3 } from "three";

// Músculos del atlas (BodyParts3D, FMA) en español
const MUSCULOS = {
  38928: "recto femoral", 38930: "vasto lateral", 38932: "vasto medial", 38934: "vasto intermedio",
  22354: "sartorio", 43883: "grácil (recto interno)", 22358: "semitendinoso", 22448: "semimembranoso",
  45888: "bíceps femoral (porción larga)", 45891: "bíceps femoral (porción corta)",
  45957: "gastrocnemio medial (gemelo interno)", 45960: "gastrocnemio lateral (gemelo externo)",
  22591: "poplíteo", 58776: "cintilla iliotibial", 22544: "tibial anterior", 22558: "sóleo",
  34680: "deltoides anterior", 34682: "deltoides medio", 34684: "deltoides posterior",
  32544: "supraespinoso", 32547: "infraespinoso", 32553: "redondo menor", 32551: "redondo mayor",
  13414: "subescapular", 34690: "pectoral mayor (porción clavicular)", 79979: "pectoral mayor (porción esternocostal)",
  33586: "trapecio superior", 33584: "trapecio medio",
  37686: "bíceps braquial (porción larga)", 37684: "bíceps braquial (porción corta)",
  37699: "tríceps braquial (porción larga)", 37697: "tríceps braquial (porción lateral)", 37695: "tríceps braquial (porción medial)",
  37665: "coracobraquial",
  22328: "glúteo mayor", 22330: "glúteo medio", 22332: "glúteo menor", 22340: "piriforme",
  22425: "tensor de la fascia lata", 22322: "ilíaco", 22342: "psoas mayor",
  22456: "aductor largo", 22452: "aductor corto", 22459: "aductor mayor",
  37668: "braquial", 38486: "braquiorradial (supinador largo)",
  38495: "extensor radial largo del carpo", 38498: "extensor radial corto del carpo", 38501: "extensor de los dedos",
  BP45: "extensor cubital del carpo", BP47: "extensor cubital del carpo",
  38560: "pronador redondo", 38562: "pronador redondo", 38460: "flexor radial del carpo", 38463: "palmar largo",
  38617: "flexor cubital del carpo", 38619: "flexor cubital del carpo",
  38638: "flexor superficial de los dedos", 38640: "flexor superficial de los dedos",
  42398: "lumbricales", 42402: "interóseos palmares", 42404: "interóseos dorsales",
  37386: "abductor corto del pulgar", 37390: "oponente del pulgar", 37400: "oponente del meñique",
  46121: "aductor del pulgar", 46123: "aductor del pulgar", 38454: "pronador cuadrado",
  38479: "flexor profundo de los dedos", 38516: "abductor largo del pulgar",
  22546: "extensor largo del dedo gordo", 22548: "extensor largo de los dedos",
  22552: "peroneo largo", 22554: "peroneo corto", 22550: "peroneo anterior (tercero)",
  258847: "tendón de Aquiles", 65014: "flexor largo del dedo gordo", 65016: "flexor largo de los dedos",
  51142: "extensor corto de los dedos (pedio)", 51144: "extensor corto del dedo gordo", 37461: "flexor corto de los dedos",
  45971: "flexor corto del dedo gordo", 45973: "flexor corto del dedo gordo",
  46018: "aductor del dedo gordo", 46020: "aductor del dedo gordo", 74140: "interóseos dorsales del pie",
};

const DEDO_MANO = ["", "pulgar", "índice", "medio", "anular", "meñique"];
const DEDO_PIE = ["", "dedo gordo", "segundo dedo", "tercer dedo", "cuarto dedo", "quinto dedo"];
const ORD = ["", "1er", "2°", "3er", "4°", "5°"];
const CARPO = {
  escafoides: "escafoides", semilunar: "semilunar", piramidal: "piramidal", pisiforme: "pisiforme",
  trapecio: "trapecio", trapezoide: "trapezoide", grande: "hueso grande", ganchoso: "ganchoso",
};
const TARSO = { astragalo: "astrágalo", navicular: "navicular (escafoides del pie)", cuboides: "cuboides",
  cun_med: "cuña medial", cun_int: "cuña intermedia", cun_lat: "cuña lateral" };

/** Nombre del hueso y la parte que tocó (deducida por la posición) */
function hueso(clave, p, J) {
  const V = (k) => new Vector3(...J["r-" + k]);
  const med = (ref) => p.x > ref.x; // más hacia la línea media
  const K = V("knee"), C = V("upper-leg"), H = V("shoulder"), E = V("elbow"), W = V("hand"), A = V("ankle");
  let m;
  switch (clave) {
    case "femur":
      if (p.y > C.y - 0.45) return ["fémur", p.x < C.x - 0.35 ? "trocánter mayor" : "cabeza y cuello femoral"];
      if (p.y < K.y + 0.6) return ["fémur", p.z > K.z + 0.3 ? "tróclea femoral" : (med(K) ? "cóndilo femoral medial" : "cóndilo femoral lateral")];
      return ["fémur", "diáfisis femoral"];
    case "patela": return ["rótula", p.y > K.y + 0.45 ? "polo superior de la rótula" : p.y < K.y + 0.2 ? "polo inferior de la rótula" : ""];
    case "tibia":
      if (p.y > K.y - 0.6) return ["tibia", p.z > K.z + 0.3 && p.y < K.y - 0.25 ? "tuberosidad anterior de la tibia" : (med(K) ? "meseta tibial medial" : "meseta tibial lateral")];
      if (p.y < A.y + 0.5) return ["tibia", med(A) ? "maléolo medial" : "tibia distal / pilón"];
      return ["tibia", "diáfisis tibial"];
    case "perone":
      if (p.y > K.y - 0.6) return ["peroné", "cabeza del peroné"];
      if (p.y < A.y + 0.5) return ["peroné", "maléolo lateral"];
      return ["peroné", "diáfisis del peroné"];
    case "coxal":
      if (p.y > C.y + 0.9) return ["hueso coxal", p.z > C.z + 0.3 ? "espina ilíaca anterosuperior" : (p.z < C.z - 0.4 && p.x > -0.75 ? "articulación sacroilíaca" : "cresta ilíaca")];
      if (p.y < C.y - 0.1 && p.z < C.z - 0.25) return ["hueso coxal", "tuberosidad isquiática"];
      if (p.x > C.x + 0.4) return ["hueso coxal", "rama del pubis"];
      return ["hueso coxal", "acetábulo y ala ilíaca"];
    case "sacro": return ["sacro", ""];
    case "humero":
      if (p.y > H.y - 0.5) return ["húmero", p.x < H.x - 0.15 ? "troquíter / tubérculo mayor" : p.z > H.z + 0.15 ? "corredera bicipital y troquín" : "cabeza humeral"];
      if (p.y < E.y + 0.5) return ["húmero", med(E) ? "epicóndilo medial / epitróclea" : "epicóndilo lateral"];
      return ["húmero", "diáfisis humeral"];
    case "escapula":
      if (p.y > H.y + 0.15 && p.x < H.x + 0.6) return ["escápula", "acromion"];
      if (p.z > H.z + 0.1) return ["escápula", "apófisis coracoides"];
      return ["escápula", p.y > H.y - 0.35 ? "espina de la escápula" : "cuerpo de la escápula"];
    case "clavicula":
      return ["clavícula", p.x < H.x + 0.6 ? "extremo acromial / acromioclavicular" : p.x > -0.45 ? "extremo esternal" : "tercio medio"];
    case "radio":
      if (p.y > E.y - 0.5) return ["radio", "cabeza del radio"];
      return ["radio", p.y < W.y + 0.4 ? "radio distal / estiloides radial" : "diáfisis del radio"];
    case "cubito":
      if (p.y > E.y - 0.35 && p.z < E.z) return ["cúbito", "olécranon"];
      return ["cúbito", p.y < W.y + 0.4 ? "cúbito distal / estiloides cubital" : "diáfisis del cúbito"];
    case "calcaneo": return ["calcáneo", p.z < A.z - 0.25 ? "tuberosidad del calcáneo / talón" : "cara plantar del calcáneo"];
    default: break;
  }
  if (CARPO[clave]) return [CARPO[clave], "carpo"];
  if (TARSO[clave]) return [TARSO[clave], "tarso"];
  if ((m = clave.match(/^mc(\d)$/))) return [`${ORD[m[1]]} metacarpiano`, ""];
  if ((m = clave.match(/^f([pmd])(\d)$/))) return [`falange ${{ p: "proximal", m: "media", d: "distal" }[m[1]]} del ${DEDO_MANO[m[2]]}`, ""];
  if ((m = clave.match(/^mt(\d)$/))) return [`${ORD[m[1]]} metatarsiano`, ""];
  if ((m = clave.match(/^p([pmd])(\d)$/))) return [`falange ${{ p: "proximal", m: "media", d: "distal" }[m[1]]} del ${DEDO_PIE[m[2]]}`, ""];
  return [clave, ""];
}

/** Cara según hacia dónde mira la superficie */
function cara(zona, n) {
  const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
  if (zona === "tobillo" && ay >= ax && ay >= az) return n.y < 0 ? "plantar" : "dorsal";
  if (az >= ax && az >= ay) return zona === "mano" ? (n.z > 0 ? "palmar" : "dorsal") : (n.z > 0 ? "anterior" : "posterior");
  if (ax >= ay) return n.x > 0 ? "medial" : "lateral";
  return n.y > 0 ? "superior" : "inferior";
}

const ARTIC = { rodilla: "knee", cadera: "upper-leg", hombro: "shoulder", codo: "elbow", mano: "hand", tobillo: "ankle" };

/** Altura respecto de la articulación de la zona */
function altura(zona, p, J) {
  const art = new Vector3(...J["r-" + ARTIC[zona]]);
  if (zona === "mano") {
    // muñeca / palma o dorso de la mano / dedos (pasado los nudillos)
    const d = p.distanceTo(art), mcp = art.distanceTo(new Vector3(...J["r-finger-3-1"]));
    return d < 0.3 ? "a nivel de la muñeca" : d < mcp + 0.08 ? "en la mano" : "en los dedos";
  }
  if (zona === "tobillo" && (p.y < art.y - 0.3 || p.z > art.z + 0.5)) {
    return p.z < art.z ? "retropié" : p.z < new Vector3(...J["r-toe-3-1"]).z - 0.4 ? "mediopié" : "antepié";
  }
  const d = p.y - art.y;
  return Math.abs(d) < 0.22 ? "a nivel de la articulación" : d > 0 ? "por encima de la articulación" : "por debajo de la articulación";
}

/** Lo que se deduce y no se ve (p. ej. los meniscos) */
function deducido(zona, p, J, c) {
  if (zona === "rodilla") {
    const K = new Vector3(...J["r-knee"]);
    if (Math.abs(p.y - K.y) < 0.2) {
      const lado = p.x > K.x ? "medial" : "lateral";
      if (c === lado || ((c === "anterior" || c === "posterior") && Math.abs(p.x - K.x) > 0.18)) {
        return `interlínea ${lado}${c === "posterior" ? " posterior" : ""} (posible menisco ${lado}${c === "posterior" ? ", cuerno posterior" : ""})`;
      }
    }
  }
  return "";
}

/**
 * Describe el punto tocado.
 *  capa: "piel" | "musculo" | "hueso";  malla: nombre de la pieza ("musculo-38932", "hueso-tibia", "piel")
 *  debajo: si tocó la piel, la pieza que está justo debajo (o null)
 *  p, n: punto y normal en coordenadas del modelo derecho
 */
export function describir({ zona, capa, malla, debajo, p, n, J }) {
  const nombre = (m) => {
    if (!m) return ["", ""];
    if (m.startsWith("musculo-")) return [MUSCULOS[m.slice(8)] || "músculo", ""];
    if (m.startsWith("hueso-")) return hueso(m.slice(6), p, J);
    return ["", ""];
  };
  const [estructura, parte] = capa === "piel" ? ["", ""] : nombre(malla);
  const [bajo, bajoParte] = capa === "piel" ? nombre(debajo) : ["", ""];
  const c = cara(zona, n);
  const alt = altura(zona, p, J);
  const ded = deducido(zona, p, J, c);
  const CAPA = { piel: "Piel", musculo: "Músculo", hueso: "Hueso" };
  const que = capa === "piel"
    ? `Piel${bajo ? ` sobre ${bajo}${bajoParte ? ` (${bajoParte})` : ""}` : ""}`
    : `${CAPA[capa]}: ${estructura}${parte ? ` (${parte})` : ""}`;
  const texto = `${que} — cara ${c}, ${alt}${ded ? ` · ${ded}` : ""}`;
  const corto = capa === "piel" ? (bajoParte || bajo || `piel ${c}`) : (parte || estructura);
  return { capa, estructura: estructura || bajo, parte: parte || bajoParte, cara: c, altura: alt, deducido: ded, texto, corto };
}
