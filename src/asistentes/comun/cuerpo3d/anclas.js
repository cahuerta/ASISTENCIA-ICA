// src/asistentes/comun/cuerpo3d/anclas.js
// Dónde va, en el cuerpo 3D, cada punto de los esquemas de siempre (rodillapuntos.js,
// hombropuntos.js, ...). Mismas claves, mismos nombres y misma "vista": la orden y la
// IA reciben exactamente lo mismo que con los dibujos.
// Cada ancla: [centro, dirección] → el punto queda en la piel, en el rayo que entra
// desde "dirección" hacia "centro".
import { Vector3 } from "three";
import { RODILLA_PUNTOS_BY_VISTA } from "../../../rodilla/rodillapuntos.js";
import { HOMBRO_PUNTOS_BY_VISTA } from "../../../hombro/hombropuntos.js";
import { CADERA_PUNTOS_BY_VISTA } from "../../../cadera/caderapuntos.js";
import { CODO_PUNTOS_BY_VISTA } from "../../../codo/codopuntos.js";
import { MANO_PUNTOS_BY_VISTA } from "../../../mano/manopuntos.js";
import { PIE_PUNTOS_BY_VISTA } from "../../../tobillo/piepuntos.js";

// Vistas que guarda cada esquema (las mismas claves de su "porVista")
export const VISTAS = {
  rodilla: { puntos: RODILLA_PUNTOS_BY_VISTA, vistas: ["frente", "lateral", "posterior"] },
  hombro: { puntos: HOMBRO_PUNTOS_BY_VISTA, vistas: ["frontal", "posterior"], alias: { frontal: "anterior" } },
  cadera: { puntos: CADERA_PUNTOS_BY_VISTA, vistas: ["anterior", "posterior"] },
  codo: { puntos: CODO_PUNTOS_BY_VISTA, vistas: ["frontal", "posterior"] },
  mano: { puntos: MANO_PUNTOS_BY_VISTA, vistas: ["palmar", "dorsal"] },
  tobillo: { puntos: PIE_PUNTOS_BY_VISTA, vistas: ["frente", "plantar", "posterior"] },
};

/** Anclas de un esquema: [{ vista, key, label, centro, dir }] (s = "r" | "l") */
export function anclas(mapperId, J, s) {
  const X = (k) => new Vector3(...J[`${s}-${k}`] || J[k]);
  const lat = s === "r" ? -1 : 1;
  const v = (x, y, z) => new Vector3(x, y, z);
  const ANT = v(0, 0, 1), POST = v(0, 0, -1), LAT = v(lat, 0, 0), MED = v(-lat, 0, 0), UP = v(0, 1, 0), DOWN = v(0, -1, 0);
  const mez = (...ps) => ps.reduce((a, [d, w]) => a.addScaledVector(d, w), v(0, 0, 0)).normalize();
  const en = (a, b, t) => X(a).lerp(X(b), t);
  const mas = (p, x, y, z) => p.clone().add(v(x, y, z));
  // perpendicular al eje de un segmento (para brazo y antebrazo, que van en diagonal)
  const perp = (d, a, b) => { const ax = X(b).sub(X(a)).normalize(); return d.clone().addScaledVector(ax, -d.dot(ax)).normalize(); };
  let A = {};

  if (mapperId === "rodilla") {
    const k = X("knee");
    A = {
      frente: {
        rotula: [mas(k, 0, 0.25, 0), ANT],
        interlinea_medial: [mas(k, 0, -0.1, 0), mez([MED, 1], [ANT, 0.45])],
        interlinea_lateral: [mas(k, 0, -0.1, 0), mez([LAT, 1], [ANT, 0.45])],
        tendon_rotuliano: [mas(k, 0, -0.35, 0), ANT],
        tuberosidad_anterior_tibial: [mas(k, 0, -0.7, 0), ANT],
        retinaculo_medial: [mas(k, 0, 0.3, 0), mez([MED, 0.8], [ANT, 1])],
        retinaculo_lateral: [mas(k, 0, 0.3, 0), mez([LAT, 0.8], [ANT, 1])],
        pes_anserina: [mas(k, 0, -0.85, 0), mez([MED, 1], [ANT, 0.6])],
        tracto_iliotibial: [mas(k, 0, -0.45, 0), mez([LAT, 1], [ANT, 0.5])],
      },
      posterior: {
        fosa_poplitea: [k, POST],
        interlinea_medial_posterior: [mas(k, 0, -0.12, 0), mez([POST, 1], [MED, 0.8])],
        interlinea_lateral_posterior: [mas(k, 0, -0.12, 0), mez([POST, 1], [LAT, 0.8])],
        biceps_femoral: [mas(k, 0, 0.65, 0), mez([POST, 1], [LAT, 0.9])],
        gastrocnemios: [mas(k, 0, -1.0, 0), POST],
      },
      // La vista lateral repetía puntos de las otras; en 3D queda solo el cuádriceps
      lateral: { cuadriceps: [mas(k, 0, 1.25, 0), mez([ANT, 1], [LAT, 0.3])] },
    };
  }

  if (mapperId === "hombro") {
    const h = X("shoulder");
    A = {
      frontal: {
        acromioclavicular: [mas(h, -lat * 0.35, 0.4, 0), mez([UP, 1], [ANT, 0.3])],
        subacromial_ant: [mas(h, lat * 0.1, 0.2, 0), mez([ANT, 1], [LAT, 0.7], [UP, 0.3])],
        surco_bicipital: [en("shoulder", "elbow", 0.22), ANT],
        coracoides: [mas(h, -lat * 0.45, 0.05, 0), ANT],
        tuberculo_mayor: [mas(h, lat * 0.25, -0.1, 0), mez([LAT, 1], [ANT, 0.3])],
        surco_deltopectoral: [mas(h, -lat * 0.3, -0.45, 0), ANT],
      },
      posterior: {
        gh_posterior_linea: [h, mez([POST, 1], [LAT, 0.2])],
        supraespinoso: [mas(h, -lat * 0.7, 0.3, 0), mez([POST, 1], [UP, 0.5])],
        infraespinoso_footprint: [mas(h, -lat * 0.6, -0.4, 0), POST],
        subacromial_post: [mas(h, lat * 0.15, 0.25, 0), mez([POST, 1], [LAT, 0.6], [UP, 0.3])],
      },
    };
  }

  if (mapperId === "cadera") {
    const c = X("upper-leg"), P = new Vector3(...J.pelvis);
    A = {
      anterior: {
        eias: [mas(c, lat * 0.2, 0.95, 0), mez([ANT, 1], [LAT, 0.3])],
        region_inguinal: [mas(c, -lat * 0.25, -0.05, 0), ANT],
        trocanter_mayor: [mas(c, 0, -0.35, 0), LAT],
        aductores_pubis: [mas(c, -lat * 0.55, -0.55, 0), mez([ANT, 1], [MED, 0.5])],
        sinfisis_pubica: [v(0, c.y + 0.05, c.z), ANT],
      },
      posterior: {
        sacroiliaca: [v(lat * 0.45, P.y + 0.45, P.z), POST],
        bursa_trocanterica: [mas(c, 0, -0.3, 0), mez([LAT, 1], [POST, 0.6])],
        piriforme: [mas(c, -lat * 0.25, 0.25, 0), POST],
        isquiotibiales_prox: [mas(c, -lat * 0.15, -0.75, 0), POST],
      },
    };
  }

  if (mapperId === "codo") {
    const e = X("elbow");
    const L = perp(LAT, "elbow", "hand"), M = L.clone().negate();
    const prox = X("shoulder").sub(e).normalize();
    A = {
      frontal: {
        epicondilo_medial: [e, M],
        epicondilo_lateral: [e, L],
        tendon_biceps: [e.clone().addScaledVector(prox, -0.15), ANT],
      },
      posterior: {
        epicondilo_medial_post: [e, mez([M, 1], [POST, 0.7])],
        epicondilo_lateral_post: [e, mez([L, 1], [POST, 0.7])],
        tendon_triceps: [e.clone().addScaledVector(prox, 0.25), POST],
      },
    };
  }

  if (mapperId === "mano") {
    // Dorso: el lado de la mano que mira hacia afuera y arriba (el modelo está con los brazos abiertos)
    const w = X("hand"), ax = X("finger-3-1").sub(w).normalize();
    const tr = X("finger-2-1").sub(X("finger-5-1")).normalize();
    let DORS = new Vector3().crossVectors(ax, tr).normalize();
    if (DORS.dot(v(lat, 1, 0)) < 0) DORS.negate();
    const PALM = DORS.clone().negate();
    const RAD = X("finger-2-1").sub(X("finger-5-1")).normalize(), ULN = RAD.clone().negate();
    const dedos = (dir) => ({
      pulgar_ip: [X("finger-1-3"), dir],
      indice_ifd: [X("finger-2-3"), dir], indice_ifp: [X("finger-2-2"), dir],
      medio_ifd: [X("finger-3-3"), dir], medio_ifp: [X("finger-3-2"), dir],
      anular_ifd: [X("finger-4-3"), dir], anular_ifp: [X("finger-4-2"), dir],
      menique_ifd: [X("finger-5-3"), dir], menique_ifp: [X("finger-5-2"), dir],
    });
    A = {
      palmar: {
        ...dedos(PALM),
        pulgar_cmc: [X("finger-1-2"), PALM],
        a1_indice: [X("finger-2-1"), PALM], a1_medio: [X("finger-3-1"), PALM],
        a1_anular: [X("finger-4-1"), PALM], a1_menique: [X("finger-5-1"), PALM],
        palma_tenar: [en("hand", "finger-1-2", 0.6), PALM],
        palma_hipotenar: [en("hand", "finger-5-1", 0.55), PALM],
        tunel_carpiano: [en("hand", "finger-3-1", 0.2), PALM],
        canal_guyon: [en("hand", "finger-5-1", 0.22), mez([PALM, 1], [ULN, 0.3])],
      },
      dorsal: {
        ...dedos(DORS),
        dorso_tabaquera: [en("hand", "finger-1-1", 0.7), mez([DORS, 0.6], [RAD, 1])],
        dorso_SL: [en("hand", "finger-3-1", 0.15), DORS],
        dorso_lister: [en("hand", "finger-2-1", -0.05), DORS],
        dorso_comp1: [en("hand", "finger-1-1", 0.3), mez([DORS, 0.5], [RAD, 1])],
        dorso_comp2: [en("hand", "finger-2-1", 0.12), mez([DORS, 1], [RAD, 0.3])],
        dorso_ecu_surco: [en("hand", "finger-5-1", 0.02), mez([DORS, 0.6], [ULN, 1])],
        dorso_tfcc: [en("hand", "finger-5-1", 0.12), mez([DORS, 1], [ULN, 0.6])],
        dorso_boss: [en("hand", "finger-3-1", 0.5), DORS],
      },
    };
  }

  if (mapperId === "tobillo") {
    const a = X("ankle");
    A = {
      frente: {
        fr_maleolo_medial: [mas(a, 0, -0.05, 0), MED],
        fr_maleolo_lateral: [mas(a, 0, -0.15, 0), LAT],
        fr_tibial_ant: [mas(a, -lat * 0.1, 0.05, 0), mez([ANT, 1], [MED, 0.3])],
        fr_cabeza_mt1: [X("toe-1-1"), mez([UP, 1], [MED, 0.3])],
        fr_dorso_mt2: [en("foot-1", "toe-2-1", 0.5), UP],
      },
      posterior: {
        po_aquiles_medio: [mas(a, 0, 0.55, 0), POST],
        po_aquiles_ins: [mas(a, 0, -0.35, 0), POST],
        po_maleolo_med: [a, mez([MED, 1], [POST, 0.6])],
        po_maleolo_lat: [mas(a, 0, -0.1, 0), mez([LAT, 1], [POST, 0.6])],
      },
      plantar: {
        pl_ins_fascia: [v(a.x, 0.2, a.z + 0.1), DOWN],
        pl_arco_long_int: [mas(en("ankle", "toe-1-1", 0.55), -lat * 0.1, 0, 0), mez([DOWN, 1], [MED, 0.3])],
        pl_cabeza_mt1: [X("toe-1-1"), DOWN],
        pl_cabeza_mt5: [X("toe-5-1"), DOWN],
        pl_centro_antepie: [X("toe-3-1"), DOWN],
      },
    };
  }

  const def = VISTAS[mapperId];
  if (!def) return [];
  const out = [];
  for (const vista of def.vistas) {
    const lista = def.puntos[vista] || def.puntos[def.alias?.[vista]] || [];
    for (const p of lista) {
      const an = A[vista]?.[p.key];
      if (an) out.push({ vista, key: p.key, label: p.label || p.key, centro: an[0], dir: an[1] });
    }
  }
  return out;
}

// Dónde mira la cámara en cada esquema y desde qué lado empieza cada vista
export function encuadre(mapperId, J, s) {
  const X = (k) => new Vector3(...J[`${s}-${k}`]);
  const lat = s === "r" ? -1 : 1;
  const c = {
    rodilla: [X("knee"), 8.5], hombro: [X("shoulder").add(new Vector3(-lat * 0.2, 0, 0)), 8],
    cadera: [X("upper-leg").add(new Vector3(-lat * 0.3, 0.2, 0)), 9.5], codo: [X("elbow"), 6.5],
    mano: [X("hand").lerp(X("finger-3-1"), 0.5), 5], tobillo: [X("ankle").lerp(X("foot-2"), 0.4), 6.5],
  }[mapperId];
  return c ? { centro: c[0], dist: c[1] } : null;
}
