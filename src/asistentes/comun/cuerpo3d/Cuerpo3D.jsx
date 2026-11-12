// src/asistentes/comun/cuerpo3d/Cuerpo3D.jsx
// Cuerpo 3D que reemplaza los dibujos de los asistentes. Solo cambia la imagen: las
// preguntas, el flujo y lo que se guarda son los mismos de siempre.
//  - modo "zona":    "¿en qué parte del cuerpo tienes el dolor?" → toca y confirma (zona y lado)
//  - modo "columna": dijo "espalda" → cuerpo de espalda, toca cuello, parte media o parte baja
//  - modo "ver":     viene con la zona ya dicha (de Ica o MiSalud): la muestra pintada
//    (estos tres con el cuerpo completo de hombre o mujer, MakeHuman CC0)
//  - modo "puntos":  la zona de cerca con el atlas BodyParts3D (piel y huesos del mismo cuerpo).
//                    El paciente toca libremente; cada toque toma el nombre del punto de los
//                    esquemas de siempre más cercano (rodillapuntos.js, ...), así "Guardar"
//                    entrega lo mismo que entregaban los dibujos.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ARTICULACIONES from "./articulaciones.json";
import ATLAS from "./atlas.json";
import { crearAnatomia, zonaIpo, ladoDe, clavesDeZona } from "./anatomia.js";
import { anclas, encuadre, VISTAS } from "./anclas.js";

const AZUL = "#1B3B8C";
const PIEL = new THREE.Color(0xc08a6c).convertSRGBToLinear();
const PINTADA = new THREE.Color(0xe0503c).convertSRGBToLinear();
const PIEL_ATLAS = new THREE.Color(0xd99a7c).convertSRGBToLinear();
const HUESO = new THREE.Color(0xeee3cc).convertSRGBToLinear();

const NOMBRE_VISTA = {
  frente: "Frente", frontal: "Frente", anterior: "Frente", posterior: "Atrás", lateral: "Lado",
  palmar: "Palma", dorsal: "Dorso", plantar: "Planta",
};
const COLUMNA = { cervical: "Columna cervical", dorsal: "Columna dorsal", lumbar: "Columna lumbar" };
const NOMBRE_ZONA = { rodilla: "Rodilla", hombro: "Hombro", cadera: "Cadera", codo: "Codo", mano: "Mano", tobillo: "Tobillo y pie" };

// Cada archivo se baja una sola vez
const cache = {};
function bajar(ruta) {
  if (!cache[ruta]) {
    cache[ruta] = fetch(ruta)
      .then((r) => { if (!r.ok) throw new Error(`Modelo ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => new Promise((ok, mal) => new GLTFLoader().parse(buf, "", ok, mal)))
      .catch((e) => { delete cache[ruta]; throw e; });
  }
  return cache[ruta];
}
// Articulaciones del atlas para los dos lados (el izquierdo es el espejo del derecho)
const J_ATLAS = (() => {
  const j = { ...ATLAS };
  for (const [k, v] of Object.entries(ATLAS)) if (k.startsWith("r-")) j["l-" + k.slice(2)] = [-v[0], v[1], v[2]];
  return j;
})();

export default function Cuerpo3D({ modo, sexo, zona, lado, mapperId, onElegir, onColumna, onGuardar, alto = 380 }) {
  const cual = String(sexo || "").toLowerCase().startsWith("f") ? "mujer" : "hombre";
  const s = String(lado || "").toLowerCase().startsWith("i") ? "l" : "r";
  const caja = useRef(null);
  const motor = useRef(null);
  const [estado, setEstado] = useState("cargando");
  const [tocado, setTocado] = useState(null); // zona / columna: { zona, lado, nombre }
  const [marcas, setMarcas] = useState([]);   // puntos: [{ id, label, vista }]
  const [vistas, setVistas] = useState([]);
  const [huesos, setHuesos] = useState(true);

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
    controls.minDistance = 2; controls.maxDistance = 60;
    if (modo !== "puntos" || mapperId !== "tobillo") { controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI - 0.35; }

    // Luz rasante: marca músculos y relieves
    scene.add(new THREE.HemisphereLight(0xf4f7ff, 0x2a201b, modo === "puntos" ? 0.45 : 0.32));
    const key = new THREE.DirectionalLight(0xfff1e6, modo === "puntos" ? 1.9 : 2.1); key.position.set(10, 15, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(0, 10, -12); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.3); fill.position.set(-9, 6, 4); scene.add(fill);
    const deCamara = new THREE.DirectionalLight(0xffffff, 0.4); deCamara.position.set(0, 0.6, 1);
    camera.add(deCamara); scene.add(camera);

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
    motor.current = { completo, irVista: () => {}, verHuesos: () => {}, quitar: () => {} };
    const ray = new THREE.Raycaster(), m2 = new THREE.Vector2();
    const rayoDesde = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      m2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m2, camera);
    };
    let alTocar = () => {};

    if (modo === "puntos") {
      // ---------- Zona de cerca: atlas (piel semitransparente + huesos) ----------
      const pielMat = new THREE.MeshStandardMaterial({ color: PIEL_ATLAS, roughness: 0.6, emissive: 0x2a1209, transparent: true, opacity: 0.55, depthWrite: false });
      const huesoMat = new THREE.MeshStandardMaterial({ color: HUESO, roughness: 0.5, emissive: 0x120d05 });
      const marcaMat = new THREE.MeshStandardMaterial({ color: 0xe0322b, emissive: 0x6a0d08, roughness: 0.35 });
      const gMarca = new THREE.SphereGeometry(mapperId === "mano" ? 0.045 : 0.07, 20, 14);
      const raiz = new THREE.Group();
      if (s === "l") raiz.scale.x = -1; // el izquierdo es el espejo del derecho
      scene.add(raiz);
      let piel = null, grupoHuesos = new THREE.Group(), puntosAnat = [], siguiente = 1;
      const marcasMallas = new Map();
      raiz.add(grupoHuesos);

      bajar(`/cuerpo3d/atlas/${mapperId}.glb`).then((g) => {
        if (!vivo) return;
        const copia = g.scene.clone(true);
        const mallas = [];
        copia.traverse((o) => { if (o.isMesh) mallas.push(o); });
        for (const o of mallas) {
          o.geometry = o.geometry.clone();
          o.geometry.deleteAttribute("normal"); o.geometry.computeVertexNormals();
          const nombre = o.name || o.parent?.name || "";
          if (nombre.startsWith("piel")) { piel = o; o.material = pielMat; o.renderOrder = 2; }
          else { o.material = huesoMat; }
        }
        raiz.add(copia);
        mallas.filter((o) => o !== piel).forEach((o) => grupoHuesos.attach(o));
        raiz.updateMatrixWorld(true);

        // Puntos de los esquemas de siempre, ubicados en la piel del atlas (no se muestran)
        const lista = anclas(mapperId, J_ATLAS, s);
        for (const a of lista) {
          const d = a.dir.clone().normalize();
          const r = new THREE.Raycaster(a.centro.clone().addScaledVector(d, 6), d.clone().negate());
          const h = r.intersectObject(piel).find((x) => x.point.distanceTo(a.centro) < 2.5);
          if (!h) continue;
          puntosAnat.push({ ...a, p: h.point.clone(), n: h.face.normal.clone().transformDirection(piel.matrixWorld).normalize() });
        }
        // Cámara de cada vista: promedio de las normales de sus puntos
        const enc = encuadre(mapperId, J_ATLAS, s);
        const dirs = {};
        for (const p of puntosAnat) (dirs[p.vista] ||= new THREE.Vector3()).add(p.n);
        Object.values(dirs).forEach((d) => d.normalize());
        motor.current.irVista = (v, rapido) => {
          const d = dirs[v]; if (!d || !enc) return;
          const dd = d.clone(); dd.y = Math.max(-0.95, Math.min(0.6, dd.y)); dd.normalize();
          volar(enc.centro, enc.centro.clone().addScaledVector(dd, enc.dist), rapido);
        };
        const vs = (VISTAS[mapperId]?.vistas || []).filter((v) => dirs[v]);
        setVistas(vs);
        motor.current.irVista(vs[0], true);
        setEstado("listo");
      }).catch(() => vivo && setEstado("error"));

      motor.current.verHuesos = (on) => {
        grupoHuesos.visible = on;
        pielMat.opacity = on ? 0.55 : 1; pielMat.transparent = on; pielMat.depthWrite = !on; pielMat.needsUpdate = true;
      };
      motor.current.quitar = (id) => { const mm = marcasMallas.get(id); if (mm) { scene.remove(mm); marcasMallas.delete(id); } };

      alTocar = (e) => {
        if (!piel) return;
        rayoDesde(e);
        // tocar una marca la quita
        const hm = ray.intersectObjects([...marcasMallas.values()]);
        const hp = ray.intersectObject(piel);
        // solo cuenta si la marca está a la vista (no detrás de la piel)
        if (hm.length && (!hp.length || hm[0].distance < hp[0].distance + 0.12)) {
          const id = hm[0].object.userData.id;
          motor.current.quitar(id);
          setMarcas((ms) => ms.filter((x) => x.id !== id));
          return;
        }
        const h = hp;
        if (!h.length) return;
        const p = h[0].point, n = h[0].face.normal.clone().transformDirection(piel.matrixWorld).normalize();
        // el punto de los esquemas más cercano, en la misma cara (no uno del otro lado)
        let mejor = null;
        for (const a of puntosAnat) {
          const d = a.p.distanceTo(p) + (a.n.dot(n) < 0.2 ? 5 : 0);
          if (!mejor || d < mejor.d) mejor = { d, a };
        }
        if (!mejor || mejor.d > 3) return;
        const id = siguiente++;
        const mm = new THREE.Mesh(gMarca, marcaMat);
        mm.position.copy(p).addScaledVector(n, 0.04); mm.renderOrder = 3; mm.userData.id = id;
        scene.add(mm); marcasMallas.set(id, mm);
        setMarcas((ms) => [...ms, { id, label: mejor.a.label, vista: mejor.a.vista }]);
      };
    } else {
      // ---------- Cuerpo completo (hombre o mujer) ----------
      const J = ARTICULACIONES[cual];
      const clasificar = crearAnatomia(J);
      let malla = null, claves = [], colores = null, ao = null;
      const pintar = (activas) => {
        if (!colores) return;
        const set = new Set(activas || []), c = new THREE.Color();
        for (let i = 0; i < claves.length; i++) {
          c.copy(PIEL); if (set.has(claves[i])) c.lerp(PINTADA, 0.45);
          c.multiplyScalar(ao[i]).toArray(colores, i * 3);
        }
        malla.geometry.attributes.color.needsUpdate = true;
      };
      // Sombra en el piso
      const c2 = document.createElement("canvas"); c2.width = c2.height = 128;
      const x2 = c2.getContext("2d"), gr = x2.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, "rgba(0,0,0,.35)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
      const sombra = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2), transparent: true, depthWrite: false }));
      sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.01; scene.add(sombra);

      bajar(`/cuerpo3d/${cual}.glb`).then((g) => {
        if (!vivo) return;
        let base = null;
        g.scene.traverse((o) => { if (o.isMesh && !base) base = o; });
        const geo = base.geometry.clone();
        const aoAttr = geo.attributes.color;
        geo.deleteAttribute("normal"); geo.computeVertexNormals();
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
        if (modo === "ver") { pintar(clavesDeZona(zona, lado)); completo(String(zona).startsWith("Columna") ? Math.PI : 0, true); }
        else { pintar([]); completo(modo === "columna" ? Math.PI : 0, true); }
        setEstado("listo");
      }).catch(() => vivo && setEstado("error"));

      alTocar = (e) => {
        if (!malla || modo === "ver") return;
        rayoDesde(e);
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
        const nombre = z ? `${z}${l ? (l === "Derecha" ? " derecha" : " izquierda") : ""}`.replace(/(Hombro|Codo|Tobillo) (derech|izquierd)a/, "$1 $2o") : c.zona;
        setTocado({ zona: z, lado: l, nombre });
      };
    }

    // Toque corto (no un giro)
    let abajo = null;
    const onDown = (e) => { abajo = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onUp = (e) => {
      if (!abajo) return;
      const mov = Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y), dt = performance.now() - abajo.t;
      abajo = null;
      if (mov > 8 || dt > 600) return;
      alTocar(e);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

    return () => {
      vivo = false;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach((mt) => { mt.map?.dispose(); mt.dispose(); }); } });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [modo, cual, zona, lado, mapperId]); // eslint-disable-line react-hooks/exhaustive-deps

  const quitar = (id) => { motor.current?.quitar(id); setMarcas((ms) => ms.filter((x) => x.id !== id)); };

  const guardar = () => {
    const def = VISTAS[mapperId];
    const porVista = Object.fromEntries(def.vistas.map((v) => [v, []]));
    marcas.forEach((m) => { if (porVista[m.vista] && !porVista[m.vista].includes(m.label)) porVista[m.vista].push(m.label); });
    const todos = def.vistas.flatMap((v) => porVista[v]);
    const ladoTxt = s === "l" ? "izquierda" : "derecha";
    const nombre = mapperId === "tobillo" ? "Tobillo/Pie" : mapperId[0].toUpperCase() + mapperId.slice(1);
    const seccionesExtra = def.vistas.filter((v) => porVista[v].length).map((v) => ({ title: `${nombre} — Vista ${NOMBRE_VISTA[v]}`, lines: porVista[v] }));
    onGuardar?.({
      modulo: mapperId, lado: ladoTxt, vistaSeleccionada: def.vistas[0], puntosSeleccionados: todos, seccionesExtra,
      [mapperId]: { lado: ladoTxt, vistaSeleccionada: def.vistas[0], puntosSeleccionados: todos, porVista, count: todos.length },
    });
  };

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
        {estado === "listo" && modo === "puntos" && (
          <div style={E.botonesVista}>
            {vistas.length > 1 && vistas.map((v) => (
              <button key={v} type="button" style={E.chip} onClick={() => motor.current?.irVista(v)}>{NOMBRE_VISTA[v] || v}</button>
            ))}
            <button type="button" style={{ ...E.chip, ...(huesos ? E.chipOn : null) }}
              onClick={() => { const on = !huesos; setHuesos(on); motor.current?.verHuesos(on); }}>Huesos</button>
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
          <p style={E.ayuda}>{NOMBRE_ZONA[mapperId]} {s === "l" ? "izquierda" : "derecha"}: toca donde te duele, en cualquier parte. Toca un punto rojo para quitarlo.</p>
          {marcas.length > 0 && (
            <div style={E.marcas}>
              {marcas.map((m) => (
                <button key={m.id} type="button" style={E.marca} onClick={() => quitar(m.id)}>{m.label} ✕</button>
              ))}
            </div>
          )}
          <button type="button" style={E.primario} onClick={guardar}>Guardar</button>
          <p style={E.credito}>Piel y huesos: BodyParts3D © DBCLS, CC BY-SA 2.1 JP.</p>
        </div>
      )}
    </div>
  );
}

const E = {
  marco: { display: "grid", gap: 10, width: "100%" },
  lienzo: { position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", background: "radial-gradient(120% 80% at 50% 30%, #eef2f6 0%, #dfe6ee 100%)" },
  aviso: { position: "absolute", inset: 0, display: "grid", placeItems: "center", margin: 0, color: "#5b6b82", fontWeight: 700 },
  botonesVista: { position: "absolute", top: 8, right: 8, left: 8, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  chip: { font: "700 13px system-ui, sans-serif", color: "#14223a", background: "#ffffffee", border: "1px solid #d3dce7", borderRadius: 999, padding: "7px 11px", cursor: "pointer" },
  chipOn: { background: AZUL, color: "#fff", borderColor: AZUL },
  pie: { display: "grid", gap: 8 },
  ayuda: { margin: 0, color: "#5b6b82", fontSize: 14, lineHeight: 1.4 },
  nombre: { margin: 0, fontSize: 18, fontWeight: 800, color: "#14223a" },
  marcas: { display: "flex", flexWrap: "wrap", gap: 6 },
  marca: { font: "700 13px system-ui, sans-serif", borderRadius: 999, padding: "6px 10px", border: "1px solid #e0322b", color: "#e0322b", background: "transparent", cursor: "pointer" },
  primario: { padding: "11px 18px", borderRadius: 10, border: "none", background: AZUL, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  credito: { margin: 0, fontSize: 11, color: "#64748b" },
};
