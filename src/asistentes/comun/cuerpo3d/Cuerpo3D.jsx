// src/asistentes/comun/cuerpo3d/Cuerpo3D.jsx
// Cuerpo 3D (hombre o mujer) que reemplaza los dibujos de los asistentes. Solo cambia la
// imagen: las preguntas, el flujo y lo que se guarda son los mismos de siempre.
//  - modo "zona":    "¿en qué parte del cuerpo tienes el dolor?" → toca y confirma (zona y lado)
//  - modo "columna": dijo "espalda" → cuerpo de espalda, toca cuello, parte media o parte baja
//  - modo "ver":     viene con la zona ya dicha (de Ica o MiSalud): la muestra pintada
//  - modo "puntos":  puntos dolorosos de la zona, con los mismos puntos y nombres de los
//                    esquemas de siempre; "Guardar" entrega lo mismo que entregaban los dibujos
// Modelo: MakeHuman (CC0), en public/cuerpo3d/.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ARTICULACIONES from "./articulaciones.json";
import { crearAnatomia, zonaIpo, ladoDe, clavesDeZona } from "./anatomia.js";
import { anclas, encuadre, VISTAS } from "./anclas.js";

const AZUL = "#1B3B8C";
const PIEL = new THREE.Color(0xc08a6c).convertSRGBToLinear();
const PINTADA = new THREE.Color(0xe0503c).convertSRGBToLinear();
const ROJO = 0xe0322b, GRIS = 0xf4f6fa;

const NOMBRE_VISTA = {
  frente: "Frente", frontal: "Frente", anterior: "Frente", posterior: "Atrás", lateral: "Lado",
  palmar: "Palma", dorsal: "Dorso", plantar: "Planta",
};
const COLUMNA = { cervical: "Columna cervical", dorsal: "Columna dorsal", lumbar: "Columna lumbar" };

// Un modelo por sexo, cargado una sola vez
const cache = {};
function cargarModelo(cual) {
  if (!cache[cual]) {
    cache[cual] = fetch(`/cuerpo3d/${cual}.glb`)
      .then((r) => { if (!r.ok) throw new Error(`Modelo ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => new Promise((ok, mal) => new GLTFLoader().parse(buf, "", ok, mal)))
      .then((g) => {
        let malla = null;
        g.scene.traverse((o) => { if (o.isMesh && !malla) malla = o; });
        const geo = malla.geometry;
        geo.deleteAttribute("normal");
        geo.computeVertexNormals();
        return geo;
      })
      .catch((e) => { delete cache[cual]; throw e; });
  }
  return cache[cual];
}

export default function Cuerpo3D({ modo, sexo, zona, lado, mapperId, onElegir, onColumna, onGuardar, alto = 380 }) {
  const cual = String(sexo || "").toLowerCase().startsWith("f") ? "mujer" : "hombre";
  const J = ARTICULACIONES[cual];
  const s = String(lado || "").toLowerCase().startsWith("i") ? "l" : "r";
  const caja = useRef(null);
  const motor = useRef(null);
  const [estado, setEstado] = useState("cargando");
  const [tocado, setTocado] = useState(null); // modo zona: { zona, lado, nombre }
  const [marcados, setMarcados] = useState([]); // modo puntos: índices de pines
  const [vista, setVista] = useState(null);
  const pines = useRef([]);

  useEffect(() => {
    let vivo = true;
    const el = caja.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: "highp" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = "none";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
    controls.minDistance = 2.5; controls.maxDistance = 60;
    if (modo !== "puntos" || mapperId !== "tobillo") { controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI - 0.35; }

    // Luz rasante: marca músculos y relieves
    scene.add(new THREE.HemisphereLight(0xf4f7ff, 0x2a201b, 0.32));
    const key = new THREE.DirectionalLight(0xfff1e6, 2.1); key.position.set(10, 15, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.3); fill.position.set(-9, 6, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.75); rim.position.set(0, 10, -12); scene.add(rim);
    const deCamara = new THREE.DirectionalLight(0xffffff, 0.35); deCamara.position.set(0, 0.6, 1);
    camera.add(deCamara); scene.add(camera);
    // Sombra en el piso
    const c2 = document.createElement("canvas"); c2.width = c2.height = 128;
    const x2 = c2.getContext("2d"), gr = x2.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,.35)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.01; scene.add(sombra);

    const ajustar = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h;
      camera.fov = w / h < 0.75 ? 34 : 28; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(ajustar); ro.observe(el); ajustar();

    let anim = 0;
    const volar = (target, pos, rapido) => {
      const id = ++anim;
      if (rapido || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        controls.target.copy(target); camera.position.copy(pos); controls.update(); return;
      }
      const t0 = performance.now(), dT = controls.target.clone(), dP = camera.position.clone();
      const paso = (t) => {
        if (id !== anim || !vivo) return;
        const k = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - k, 3);
        controls.target.lerpVectors(dT, target, e); camera.position.lerpVectors(dP, pos, e);
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };
    const completo = (ang, rapido) => {
      const tv = Math.tan((camera.fov * Math.PI) / 360);
      const r = Math.max((17.2 * 0.56) / tv, 10.6 / 2 / (tv * camera.aspect));
      volar(new THREE.Vector3(0, 8.3, 0), new THREE.Vector3(Math.sin(ang) * r, 8.9, Math.cos(ang) * r), rapido);
    };

    let malla = null, claves = [], colores = null, ao = null;
    const clasificar = crearAnatomia(J);
    const pintar = (activas) => {
      if (!colores) return;
      const set = new Set(activas || []), c = new THREE.Color();
      for (let i = 0; i < claves.length; i++) {
        c.copy(PIEL); if (set.has(claves[i])) c.lerp(PINTADA, 0.45);
        c.multiplyScalar(ao[i]).toArray(colores, i * 3);
      }
      malla.geometry.attributes.color.needsUpdate = true;
    };

    // Pines (modo puntos)
    const gPin = new THREE.SphereGeometry(mapperId === "mano" ? 0.045 : 0.075, 20, 14);
    const gToque = new THREE.SphereGeometry(mapperId === "mano" ? 0.09 : 0.16, 8, 6);
    const sobrePiel = (centro, dir) => {
      const r = new THREE.Raycaster(centro.clone().addScaledVector(dir, 8), dir.clone().negate());
      const hs = r.intersectObject(malla);
      if (!hs.length) return null;
      hs.sort((a, b) => a.point.distanceTo(centro) - b.point.distanceTo(centro));
      return { p: hs[0].point, n: hs[0].face.normal.clone().transformDirection(malla.matrixWorld).normalize() };
    };

    const vistasPuntos = {};
    cargarModelo(cual).then((geoBase) => {
      if (!vivo) return;
      const geo = geoBase.clone();
      const aoAttr = geo.attributes.color;
      const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
      colores = new Float32Array(n * 3); ao = new Float32Array(n); claves = new Array(n);
      const p = new THREE.Vector3(), q = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        p.fromBufferAttribute(pos, i); q.fromBufferAttribute(nor, i);
        claves[i] = clasificar(p, q).clave;
        ao[i] = aoAttr ? aoAttr.getX(i) * 1.05 : 1;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colores, 3));
      malla = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62, metalness: 0, emissive: new THREE.Color(0x2a140c) }));
      scene.add(malla);

      if (modo === "puntos") {
        const lista = anclas(mapperId, J, s);
        const enc = encuadre(mapperId, J, s);
        pines.current = [];
        for (const a of lista) {
          const h = sobrePiel(a.centro, a.dir);
          if (!h) continue;
          const pin = new THREE.Mesh(gPin, new THREE.MeshStandardMaterial({ color: GRIS, emissive: 0x333a48, roughness: 0.4 }));
          pin.position.copy(h.p).addScaledVector(h.n, mapperId === "mano" ? 0.03 : 0.05);
          const toque = new THREE.Mesh(gToque, new THREE.MeshBasicMaterial({ visible: false }));
          toque.position.copy(pin.position);
          scene.add(pin, toque);
          pines.current.push({ ...a, pin, toque, n: h.n });
          (vistasPuntos[a.vista] ||= []).push(h.n);
        }
        // Dirección de cámara de cada vista: el promedio de las normales de sus puntos
        const dirs = {};
        for (const [v, ns] of Object.entries(vistasPuntos)) dirs[v] = ns.reduce((acc, x) => acc.add(x), new THREE.Vector3()).normalize();
        motor.current.irVista = (v, rapido) => {
          const d = dirs[v]; if (!d || !enc) return;
          const dd = d.clone(); dd.y = Math.max(-0.95, Math.min(0.6, dd.y)); dd.normalize();
          volar(enc.centro, enc.centro.clone().addScaledVector(dd, enc.dist), rapido);
        };
        const primera = VISTAS[mapperId]?.vistas.find((v) => dirs[v]);
        setVista(primera || null);
        motor.current.irVista(primera, true);
        pintar([]);
      } else if (modo === "ver") {
        pintar(clavesDeZona(zona, lado));
        completo(String(zona).startsWith("Columna") ? Math.PI : 0, true);
      } else {
        pintar([]);
        completo(modo === "columna" ? Math.PI : 0, true);
      }
      setEstado("listo");
    }).catch(() => vivo && setEstado("error"));

    // Toques: un toque corto (no un giro)
    let abajo = null;
    const ray = new THREE.Raycaster(), m = new THREE.Vector2();
    const onDown = (e) => { abajo = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onUp = (e) => {
      if (!abajo || !malla) return;
      const mov = Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y), dt = performance.now() - abajo.t;
      abajo = null;
      if (mov > 8 || dt > 600) return;
      const r = renderer.domElement.getBoundingClientRect();
      m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m, camera);
      if (modo === "puntos") {
        const hp = ray.intersectObjects(pines.current.map((x) => x.toque));
        const hb = ray.intersectObject(malla);
        if (!hp.length) return;
        // si el pin queda detrás de la piel, no cuenta
        if (hb.length && hb[0].distance < hp[0].distance - 0.12) return;
        const i = pines.current.findIndex((x) => x.toque === hp[0].object);
        setMarcados((ms) => (ms.includes(i) ? ms.filter((k) => k !== i) : [...ms, i]));
        return;
      }
      if (modo === "ver") return;
      const hs = ray.intersectObject(malla);
      if (!hs.length) return;
      const nn = hs[0].face.normal.clone().transformDirection(malla.matrixWorld).normalize();
      const c = clasificar(hs[0].point, nn);
      if (modo === "columna") {
        const nivel = COLUMNA[c.clave];
        pintar(nivel ? [c.clave] : []);
        setTocado(nivel ? { zona: nivel, nombre: nivel } : { zona: null, nombre: "Toca la columna: cuello, parte media o parte baja" });
        return;
      }
      const z = zonaIpo(c.clave), l = z && !z.startsWith("Columna") ? ladoDe(c.clave) : "";
      pintar(z ? clavesDeZona(z, l) : [c.clave]);
      setTocado({ zona: z, lado: l, nombre: z ? `${z}${l ? (l === "Derecha" ? " derecha" : " izquierda") : ""}`.replace(/(Hombro|Codo|Tobillo) (derech|izquierd)a/, "$1 $2o") : c.zona });
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    motor.current = { completo, irVista: () => {} };

    return () => {
      vivo = false;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => { if (o.isMesh) { o.geometry !== gPin && o.geometry !== gToque && o.geometry.dispose(); [].concat(o.material).forEach((mt) => { mt.map?.dispose(); mt.dispose(); }); } });
      gPin.dispose(); gToque.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [modo, cual, zona, lado, mapperId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Color de los pines según lo marcado
  useEffect(() => {
    pines.current.forEach((p, i) => {
      const on = marcados.includes(i);
      p.pin.material.color.setHex(on ? ROJO : GRIS);
      p.pin.material.emissive.setHex(on ? 0x6a0d08 : 0x333a48);
      p.pin.scale.setScalar(on ? 1.3 : 1);
    });
  }, [marcados]);

  const guardar = () => {
    const def = VISTAS[mapperId];
    const porVista = Object.fromEntries(def.vistas.map((v) => [v, []]));
    marcados.forEach((i) => { const p = pines.current[i]; if (p && !porVista[p.vista].includes(p.label)) porVista[p.vista].push(p.label); });
    const todos = def.vistas.flatMap((v) => porVista[v]);
    const ladoTxt = s === "l" ? "izquierda" : "derecha";
    const nombre = mapperId === "tobillo" ? "Tobillo/Pie" : mapperId[0].toUpperCase() + mapperId.slice(1);
    const seccionesExtra = def.vistas.filter((v) => porVista[v].length).map((v) => ({ title: `${nombre} — Vista ${NOMBRE_VISTA[v]}`, lines: porVista[v] }));
    onGuardar?.({
      modulo: mapperId, lado: ladoTxt, vistaSeleccionada: vista, puntosSeleccionados: todos, seccionesExtra,
      [mapperId]: { lado: ladoTxt, vistaSeleccionada: vista, puntosSeleccionados: todos, porVista, count: todos.length },
    });
  };

  const vistas = modo === "puntos" ? (VISTAS[mapperId]?.vistas || []).filter((v) => pines.current.some((p) => p.vista === v)) : [];
  const etiquetas = marcados.map((i) => pines.current[i]?.label).filter(Boolean);

  return (
    <div style={E.marco}>
      <div ref={caja} style={{ ...E.lienzo, height: alto }}>
        {estado === "cargando" && <p style={E.aviso}>Cargando cuerpo…</p>}
        {estado === "error" && <p style={E.aviso}>No pude cargar el cuerpo 3D.</p>}
        {estado === "listo" && modo !== "puntos" && (
          <div style={E.botonesVista}>
            <button type="button" style={E.chip} onClick={() => motor.current?.completo(0)}>Frente</button>
            <button type="button" style={E.chip} onClick={() => motor.current?.completo(Math.PI)}>Espalda</button>
          </div>
        )}
        {estado === "listo" && vistas.length > 1 && (
          <div style={E.botonesVista}>
            {vistas.map((v) => (
              <button key={v} type="button" style={{ ...E.chip, ...(v === vista ? E.chipOn : null) }}
                onClick={() => { setVista(v); motor.current?.irVista(v); }}>{NOMBRE_VISTA[v] || v}</button>
            ))}
          </div>
        )}
      </div>

      {modo === "zona" && estado === "listo" && (
        <div style={E.pie}>
          {!tocado && <p style={E.ayuda}>Toca en el cuerpo dónde te duele (gíralo con un dedo).</p>}
          {tocado && <p style={E.nombre}>{tocado.nombre}</p>}
          {tocado && !tocado.zona && <p style={E.ayuda}>Por ahora reviso rodilla, cadera, hombro, codo, mano, tobillo y columna.</p>}
          {tocado?.zona && <button type="button" style={E.primario} onClick={() => onElegir?.(tocado.zona, tocado.lado)}>Sí, es aquí</button>}
        </div>
      )}
      {modo === "columna" && estado === "listo" && (
        <div style={E.pie}>
          {!tocado && <p style={E.ayuda}>Toca la columna donde te duele.</p>}
          {tocado && <p style={E.nombre}>{tocado.nombre}</p>}
          {tocado?.zona && <button type="button" style={E.primario} onClick={() => onColumna?.(tocado.zona)}>Sí, es aquí</button>}
        </div>
      )}
      {modo === "puntos" && estado === "listo" && (
        <div style={E.pie}>
          <p style={E.ayuda}>Toca los puntos donde te duele (se ponen rojos). Gira el cuerpo o usa los botones de arriba.</p>
          {etiquetas.length > 0 && <p style={E.lista}>{etiquetas.join(" · ")}</p>}
          <button type="button" style={E.primario} onClick={guardar}>Guardar</button>
        </div>
      )}
    </div>
  );
}

const E = {
  marco: { display: "grid", gap: 10, width: "100%" },
  lienzo: { position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", background: "radial-gradient(120% 80% at 50% 30%, #eef2f6 0%, #dfe6ee 100%)" },
  aviso: { position: "absolute", inset: 0, display: "grid", placeItems: "center", margin: 0, color: "#5b6b82", fontWeight: 700 },
  botonesVista: { position: "absolute", top: 8, right: 8, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  chip: { font: "700 13px system-ui, sans-serif", color: "#14223a", background: "#ffffffee", border: "1px solid #d3dce7", borderRadius: 999, padding: "7px 11px", cursor: "pointer" },
  chipOn: { background: AZUL, color: "#fff", borderColor: AZUL },
  pie: { display: "grid", gap: 8 },
  ayuda: { margin: 0, color: "#5b6b82", fontSize: 14, lineHeight: 1.4 },
  nombre: { margin: 0, fontSize: 18, fontWeight: 800, color: "#14223a" },
  lista: { margin: 0, fontSize: 13, color: "#14223a", lineHeight: 1.5 },
  primario: { padding: "11px 18px", borderRadius: 10, border: "none", background: AZUL, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" },
};
