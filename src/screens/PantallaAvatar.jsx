// src/screens/PantallaAvatar.jsx
// Asistente de voz de ICA: la medica dirige la consulta.
//
// 0. Menu (voz o botones): dolor | examenes generales | examenes para cirugia
//    (preoperatorio) | hora con traumatologo (derivacion por zona + ubicacion).
//
// DOLOR:
// 1. Anamnesis oral guiada (avatar/bancoPreguntas.js): zona, lado, edad, sexo,
//    banderas rojas (grave -> se detiene y deriva a urgencia) y preguntas abiertas.
//    Si no entiende, repregunta una vez; si vuelve a fallar, ofrece botones.
// 2. Puntos dolorosos en el esquema de la zona (mismos mappers de ICA).
// 3. /api/preview-informe (sin cambios en el backend) con la conversacion completa
//    en "consulta" + edad, sexo, zona, lado y puntos.
// 4. La medica dice el diagnostico presuntivo, el fundamento y los examenes.
// 5. "¿Quieres la orden?" -> formulario escrito (nombre, RUT, correo) ->
//    checklist de resonancia si corresponde -> /api/pdf-ia-orden (gratis por ahora).
// 6. Recomienda el especialista con /resolver-derivacion (zona + ubicacion GPS que
//    ICA guarda al abrir), y la ubicacion va a la orden para que salga la derivacion.
//
// EXAMENES GENERALES / PREOPERATORIO (mismos endpoints que los modulos de ICA):
//    edad, sexo, (cirugia y lado), enfermedades por grupos con botones abajo,
//    alergias y otras -> /ia-generales o /ia-preop -> la medica dice los examenes ->
//    "¿quieres la orden?" -> datos -> /guardar-datos-generales|preop -> /pdf-generales|preop.
//
// HORA CON TRAUMATOLOGO: zona -> /resolver-derivacion -> medico y sede.
//
// MICROFONO: al tocar "Comenzar" se pide permiso con getUserMedia (dentro del toque,
// como exige el navegador). Si no hay permiso o microfono, se avisa en pantalla y
// todo sigue con botones y texto. Si el paciente no responde en 10 s, aparecen
// los botones igual.
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "../app.css";
import Avatar from "../avatar/Avatar.jsx";
import useVoz, { vozSoportada } from "../avatar/useVoz.js";
import useEscucha, { escuchaSoportada } from "../avatar/useEscucha.js";
import {
  PREGUNTAS, FRASES, SALUDO, ZONAS, esColumna,
  MENU, GRUPOS_COMORBILIDAD, PREGUNTAS_EXTRA, CIRUGIAS,
} from "../avatar/bancoPreguntas.js";
import {
  interpretarZona, interpretarLado, interpretarEdad, interpretarSexo, interpretarSiNo,
  esRespuestaVacia, construirConsulta, leerInforme, vozResultado, incluyeResonancia,
  formatearRut, validarRut, interpretarMenu, interpretarItems, interpretarCirugia, vozExamenes,
} from "../avatar/interpretar.js";
import GenericMapper from "../mappers/GenericMapper.jsx";
import { resolveZonaKey } from "../mappers/mapperRegistry.js";
import FormularioResonancia from "../components/FormularioResonancia.jsx";
import logoICA from "../assets/ica.jpg";

const BACKEND_BASE =
  import.meta?.env?.VITE_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com";

const ZONAS_MAPPER = ["rodilla", "mano", "hombro", "codo", "cadera", "tobillo"];

// Sin respuesta en este tiempo, aparecen los botones aunque haya voz
const BOTONES_TRAS_MS = 10000;

// Endpoints de cada tipo de orden (los mismos de los modulos de ICA)
const ORDEN = {
  trauma: { pdf: (id) => `/api/pdf-ia-orden/${id}`, archivo: "orden_examenes_ICA.pdf" },
  generales: { pdf: (id) => `/pdf-generales/${id}`, archivo: "orden_examenes_generales_ICA.pdf" },
  preop: { pdf: (id) => `/pdf-preop/${id}`, archivo: "orden_preoperatoria_ICA.pdf" },
};

// Ubicacion que ICA guarda al abrir (GPS -> IP), la misma que usa el resto de ICA
function leerGeo() {
  try {
    const g = JSON.parse(sessionStorage.getItem("geo") || "null");
    return g && typeof g === "object" ? g : null;
  } catch {
    return null;
  }
}

// Pide permiso de microfono dentro del toque del usuario. Devuelve "" o el motivo.
async function pedirMicrofono() {
  if (!navigator.mediaDevices?.getUserMedia) return "";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "";
  } catch (e) {
    if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
      return "El micrófono está bloqueado. Toca el candado junto a la dirección, permite el micrófono y recarga. Mientras tanto puedes responder con los botones.";
    }
    if (e?.name === "NotFoundError") return "No encontré un micrófono. Puedes responder con los botones.";
    return "No pude activar el micrófono. Puedes responder con los botones.";
  }
}

// Mismo resumen de checklist que usa el modulo IA de ICA
const ETIQUETAS_RM = {
  marcapasos: "Marcapasos/DAI", coclear_o_neuro: "Implante coclear/neuroestimulador",
  clips_aneurisma: "Clips de aneurisma", valvula_cardiaca_metal: "Implante metálico intracraneal",
  fragmentos_metalicos: "Fragmentos metálicos/balas", protesis_placas_tornillos: "Prótesis/placas/tornillos",
  cirugia_reciente_3m: "Cirugía reciente (<3m) con implante", embarazo: "Embarazo o sospecha",
  claustrofobia: "Claustrofobia importante", peso_mayor_150: "Peso > 150 kg",
  no_permanece_inmovil: "Dificultad para inmovilidad", tatuajes_recientes: "Tatuajes/PMU < 6 semanas",
  piercings_no_removibles: "Piercings no removibles", bomba_insulina_u_otro: "Dispositivo externo activo",
  requiere_contraste: "Requiere contraste", erc_o_egfr_bajo: "Insuficiencia renal / eGFR < 30",
  alergia_gadolinio: "Alergia a gadolinio", reaccion_contrastes: "Reacción a contrastes previos",
  requiere_sedacion: "Requiere sedación", ayuno_6h: "Ayuno 6h (si sedación)",
};

function resumenRM(form = {}) {
  const marcadas = Object.keys(ETIQUETAS_RM).filter((k) => form[k] === true).map((k) => `• ${ETIQUETAS_RM[k]}`);
  const partes = [marcadas.length ? marcadas.join("\n") : "• Sin alertas marcadas en checklist."];
  const obs = (form.observaciones || "").trim();
  if (obs) partes.push(`Observaciones: ${obs}`);
  return partes.join("\n");
}

// Borra puntos de sesiones anteriores guardados por los mappers
function limpiarPuntosPrevios() {
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (ZONAS_MAPPER.some((z) => k.startsWith(`${z}_`) || k.startsWith(`${z}:`)) || k === "resonanciaJSON") {
        sessionStorage.removeItem(k);
      }
    });
  } catch {}
}

async function postJSON(ruta, cuerpo) {
  const res = await fetch(`${BACKEND_BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

class Interrumpido extends Error {}

export default function PantallaAvatar({ onUsarFormulario }) {
  const [fase, setFase] = useState("inicio");
  // inicio | conversacion | puntos | analizando | resultado | datos | resonancia | generando | lista | urgencia | fin | error
  const [pregunta, setPregunta] = useState(null);   // { texto, tipo, respaldo }
  const [entendido, setEntendido] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [informe, setInforme] = useState(null);
  const [ordenUrl, setOrdenUrl] = useState("");
  const [conCorreo, setConCorreo] = useState(false);
  const [error, setError] = useState("");
  const [textoLibre, setTextoLibre] = useState("");
  const [edadEscrita, setEdadEscrita] = useState("");
  const [esperando, setEsperando] = useState(false); // esperando respuesta del paciente
  const [avisoMic, setAvisoMic] = useState("");       // por que no hay microfono
  const [seleccion, setSeleccion] = useState([]);     // enfermedades marcadas en la pregunta actual
  const [marcadas, setMarcadas] = useState([]);       // resumen de lo marcado (chips)
  const [derivacion, setDerivacion] = useState(null); // { nota, doctor, sede, especialidad }
  const [modulo, setModulo] = useState("trauma");     // trauma | generales | preop | derivacion

  const { hablar, callar, desbloquear, hablando, boca } = useVoz();

  const sesionRef = useRef(0);            // cada "Comenzar" invalida la conversacion anterior
  const esperaRef = useRef(null);         // resolver de la respuesta que se espera
  const puntosRef = useRef(null);         // resolver del esquema de puntos
  const ctxRef = useRef({});
  const registroRef = useRef([]);
  const idPagoRef = useRef("");
  const avisosRef = useRef([]);   // mensajes de las alarmas "aviso" respondidas con si
  const escuchaRef = useRef(null);
  const conCorreoRef = useRef(false);
  const vozOkRef = useRef(escuchaSoportada);   // false si no hay permiso/microfono
  const botonesTimerRef = useRef(null);
  const moduloRef = useRef("trauma");
  const examenesRef = useRef({});              // { examenes, informeIA, comorbilidades, tipoCirugia }

  // ---------- escucha: cada frase completa resuelve la respuesta pendiente ----------
  const alEscuchar = useCallback((texto) => {
    const resolver = esperaRef.current;
    if (!resolver) return;
    esperaRef.current = null;
    setEsperando(false);
    escuchaRef.current?.pausar();
    resolver({ texto });
  }, []);

  const escucha = useEscucha({ onFrase: alEscuchar });
  escuchaRef.current = escucha;

  // Si el reconocimiento falla (permiso denegado, sin microfono), se sigue con botones
  useEffect(() => {
    if (!escucha.error) return;
    vozOkRef.current = false;
    setAvisoMic(escucha.error);
    setPregunta((p) => (p ? { ...p, respaldo: true } : p));
  }, [escucha.error]);

  useEffect(() => () => {
    sesionRef.current += 1;
    callar();
  }, [callar]);

  useEffect(() => () => { if (ordenUrl) URL.revokeObjectURL(ordenUrl); }, [ordenUrl]);

  // ---------- utilidades del flujo ----------
  const vigente = (sesion) => {
    if (sesion !== sesionRef.current) throw new Interrumpido();
  };

  const decir = async (sesion, texto) => {
    vigente(sesion);
    escuchaRef.current?.pausar();
    await hablar(texto);
    vigente(sesion);
  };

  // Respuesta por voz o por el respaldo en pantalla (botones / texto)
  const esperarRespuesta = (sesion) =>
    new Promise((resolve) => {
      esperaRef.current = resolve;
      setEsperando(true);
      if (vozOkRef.current) escuchaRef.current?.reanudar();
      // Si no responde por voz, aparecen los botones
      clearTimeout(botonesTimerRef.current);
      botonesTimerRef.current = setTimeout(
        () => setPregunta((p) => (p ? { ...p, respaldo: true } : p)),
        vozOkRef.current ? BOTONES_TRAS_MS : 0,
      );
    }).then((r) => {
      clearTimeout(botonesTimerRef.current);
      vigente(sesion);
      return r;
    });

  const responderEnPantalla = (valor) => {
    const resolver = esperaRef.current;
    if (!resolver) return;
    esperaRef.current = null;
    setEsperando(false);
    escuchaRef.current?.pausar();
    resolver({ valor, texto: String(valor) });
  };

  const INTERPRETES = {
    zona: interpretarZona,
    lado: interpretarLado,
    edad: interpretarEdad,
    sexo: interpretarSexo,
    sino: interpretarSiNo,
    menu: interpretarMenu,
    cirugia: (t) => interpretarCirugia(t)?.valor || null,
  };

  const OPCIONES = {
    zona: ZONAS.map((z) => ({ etiqueta: z, valor: z })),
    lado: [{ etiqueta: "Derecho", valor: "Derecha" }, { etiqueta: "Izquierdo", valor: "Izquierda" }],
    sexo: [{ etiqueta: "Hombre", valor: "Masculino" }, { etiqueta: "Mujer", valor: "Femenino" }],
    sino: [{ etiqueta: "Sí", valor: true }, { etiqueta: "No", valor: false }],
    menu: MENU.opciones,
    cirugia: CIRUGIAS.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor })),
  };

  const MOSTRAR = {
    zona: (v) => v,
    lado: (v) => (v === "Derecha" ? "Lado derecho" : "Lado izquierdo"),
    edad: (v) => `${v} años`,
    sexo: (v) => (v === "Masculino" ? "Hombre" : "Mujer"),
    sino: (v) => (v ? "Sí" : "No"),
    menu: (v) => MENU.opciones.find((o) => o.valor === v)?.etiqueta || v,
    cirugia: (v) => CIRUGIAS.find((c) => c.valor === v)?.etiqueta || v,
  };

  // Pregunta cerrada: voz -> si no entiende repregunta -> si falla de nuevo, botones.
  // siempreBotones: los botones se ven desde el inicio (menu, enfermedades, cirugia).
  // interprete: reemplaza al interprete del tipo (ej. grupo de enfermedades).
  const preguntarCerrada = async (sesion, tipo, texto, repregunta, siempreBotones = false, interprete = null) => {
    let intentos = 0;
    let dicho = texto;
    for (;;) {
      const respaldo = siempreBotones || !vozOkRef.current || intentos >= 2;
      setPregunta({ texto, tipo, respaldo });
      setEntendido("");
      if (dicho) await decir(sesion, dicho);
      const r = await esperarRespuesta(sesion);
      const valor = r.valor !== undefined ? r.valor : (interprete || INTERPRETES[tipo])(r.texto);
      if (valor !== null && valor !== undefined) {
        setEntendido(MOSTRAR[tipo](valor));
        return { valor, texto: r.texto };
      }
      intentos += 1;
      setEntendido(r.texto ? `No entendí: "${r.texto}"` : "");
      dicho = intentos === 1 ? repregunta : intentos === 2 ? "Puedes tocar tu respuesta en la pantalla." : null;
    }
  };

  // opcional: muestra el boton "No, nada más"
  const preguntarAbierta = async (sesion, texto, opcional = false) => {
    setPregunta({ texto, tipo: "abierta", respaldo: !vozOkRef.current, opcional });
    setEntendido("");
    setTextoLibre("");
    await decir(sesion, texto);
    const r = await esperarRespuesta(sesion);
    setEntendido(r.texto);
    return r.texto;
  };

  // Enfermedades de un grupo: "¿Tienes A, B o C?" (Si/No) -> si es si y hay
  // varias, "¿Cuál o cuáles?" con chips para marcar. Devuelve las claves.
  const preguntarGrupo = async (sesion, grupo) => {
    // Nombrar una enfermedad ("diabetes") cuenta como si, aunque no diga "si"
    const r1 = await preguntarCerrada(
      sesion, "sino", grupo.texto, `Responde sí o no, por favor: ${grupo.texto}`, true,
      (t) => (interpretarItems(grupo.items, t).length ? true : interpretarSiNo(t)),
    );
    // Si ya dijo cuales en la misma frase ("tengo diabetes"), no se repregunta
    const dichas = r1.texto ? interpretarItems(grupo.items, r1.texto) : [];
    if (dichas.length) return dichas;
    if (!r1.valor) return [];
    if (grupo.items.length === 1) return [grupo.items[0].key];

    let intentos = 0;
    let dicho = PREGUNTAS_EXTRA.cual;
    for (;;) {
      setSeleccion([]);
      setPregunta({ texto: PREGUNTAS_EXTRA.cual, tipo: "items", items: grupo.items, respaldo: true });
      setEntendido("");
      if (dicho) await decir(sesion, dicho);
      const r = await esperarRespuesta(sesion);
      const claves = Array.isArray(r.valor) ? r.valor : interpretarItems(grupo.items, r.texto);
      if (claves.length) return claves;
      intentos += 1;
      setEntendido(r.texto ? `No entendí: "${r.texto}"` : "");
      dicho = intentos === 1 ? "Perdón, no te entendí. Márcalas abajo, por favor." : null;
    }
  };

  const etiquetaComorb = (key) => {
    for (const g of GRUPOS_COMORBILIDAD) {
      const it = g.items.find((i) => i.key === key);
      if (it) return it.etiqueta;
    }
    return key;
  };

  const recomendarEspecialista = async (zona) => {
    try {
      const r = await postJSON("/resolver-derivacion", { dolor: zona, geo: leerGeo() || undefined });
      if (r?.nota) {
        setDerivacion(r);
        return r;
      }
    } catch {
      // sin derivacion: el flujo sigue
    }
    return null;
  };

  // ---------- puntos dolorosos ----------
  const esperarPuntos = (sesion) =>
    new Promise((resolve) => {
      puntosRef.current = resolve;
    }).then((r) => {
      vigente(sesion);
      return r;
    });

  const terminarPuntos = (resultado) => {
    const resolver = puntosRef.current;
    if (!resolver) return;
    puntosRef.current = null;
    resolver(resultado);
  };

  useEffect(() => {
    if (fase !== "puntos") return undefined;
    const volver = () => terminarPuntos(null);
    const eventos = ZONAS_MAPPER.map((z) => `${z}:volver`).concat("mapper:volver");
    eventos.forEach((e) => window.addEventListener(e, volver));
    return () => eventos.forEach((e) => window.removeEventListener(e, volver));
  }, [fase]);

  // ---------- menu inicial ----------
  const elegirModulo = (m) => {
    moduloRef.current = m;
    setModulo(m);
  };

  const menu = async (sesion) => {
    setFase("conversacion");
    setProgreso(0);
    const { valor } = await preguntarCerrada(sesion, "menu", MENU.texto, MENU.repregunta, true);
    setEntendido("");
    elegirModulo(valor === "dolor" ? "trauma" : valor);
    if (valor === "generales" || valor === "preop") return flujoExamenes(sesion, valor);
    if (valor === "derivacion") return flujoDerivacion(sesion);
    return conversar(sesion);
  };

  // ---------- hora con traumatologo ----------
  const flujoDerivacion = async (sesion) => {
    const { valor: zona } = await preguntarCerrada(
      sesion, "zona", FRASES.derivacionZona, PREGUNTAS[0].repregunta, true,
    );
    ctxRef.current.zona = zona;
    setPregunta(null);
    setFase("analizando");
    await decir(sesion, FRASES.buscandoEspecialista);
    const r = await recomendarEspecialista(zona);
    vigente(sesion);
    setFase("derivacion");
    await decir(sesion, r?.nota || FRASES.derivacionError);
  };

  // ---------- examenes generales / preoperatorio ----------
  const flujoExamenes = async (sesion, tipo) => {
    const ctx = ctxRef.current;
    const pasos = tipo === "preop" ? 10 : 8;
    let paso = 0;
    const avanzar = () => setProgreso(Math.round((++paso / pasos) * 100));

    setFase("conversacion");
    await decir(sesion, tipo === "preop" ? FRASES.inicioPreop : FRASES.inicioGenerales);

    let tipoCirugia = "";
    if (tipo === "preop") {
      const { valor } = await preguntarCerrada(sesion, "cirugia", FRASES.cirugia, FRASES.repreguntaCirugia, true);
      avanzar();
      const cir = CIRUGIAS.find((c) => c.valor === valor);
      if (valor === "OTRA") {
        tipoCirugia = String(await preguntarAbierta(sesion, FRASES.cirugiaOtra) || "").trim().toUpperCase();
      } else {
        tipoCirugia = valor;
      }
      if (cir?.zona) {
        ctx.zona = cir.zona;
        const { valor: lado } = await preguntarCerrada(sesion, "lado", FRASES.ladoCirugia, PREGUNTAS[1].repregunta, true);
        ctx.lado = lado;
      }
      avanzar();
    }

    const pEdad = PREGUNTAS.find((p) => p.id === "edad");
    const pSexo = PREGUNTAS.find((p) => p.id === "sexo");
    ctx.edad = (await preguntarCerrada(sesion, "edad", pEdad.texto, pEdad.repregunta)).valor;
    avanzar();
    ctx.sexo = (await preguntarCerrada(sesion, "sexo", pSexo.texto, pSexo.repregunta, true)).valor;
    avanzar();

    // Enfermedades por grupos, botones abajo
    await decir(sesion, FRASES.enfermedades);
    const comorbilidades = {};
    GRUPOS_COMORBILIDAD.forEach((g) => g.items.forEach((i) => { comorbilidades[i.key] = false; }));
    const lista = [];
    setMarcadas([]);
    for (const grupo of GRUPOS_COMORBILIDAD) {
      const claves = await preguntarGrupo(sesion, grupo);
      claves.forEach((k) => { comorbilidades[k] = true; lista.push(etiquetaComorb(k)); });
      setMarcadas([...lista]);
      setEntendido(claves.length ? claves.map(etiquetaComorb).join(", ") : "Ninguna");
      avanzar();
    }

    // Alergias
    const rAl = await preguntarCerrada(sesion, "sino", PREGUNTAS_EXTRA.alergias, `Responde sí o no, por favor: ${PREGUNTAS_EXTRA.alergias}`, true);
    let alergiasDetalle = "";
    if (rAl.valor) {
      alergiasDetalle = String(await preguntarAbierta(sesion, PREGUNTAS_EXTRA.alergiasCual) || "").trim();
      lista.push(`Alergia: ${alergiasDetalle || "sí"}`);
      setMarcadas([...lista]);
    }
    avanzar();

    // Otras enfermedades (opcional)
    const otrasResp = await preguntarAbierta(sesion, PREGUNTAS_EXTRA.otras, true);
    const otras = esRespuestaVacia(otrasResp) ? "" : String(otrasResp || "").trim();
    if (otras) { lista.push(otras); setMarcadas([...lista]); }
    setProgreso(100);

    // Mismo formato que FormularioComorbilidades + "alergias" como lo lee el backend
    Object.assign(comorbilidades, {
      alergias_flag: Boolean(rAl.valor),
      alergias_detalle: alergiasDetalle,
      alergias: { tiene: Boolean(rAl.valor), detalle: alergiasDetalle },
      otras,
    });

    await analizarExamenes(sesion, tipo, comorbilidades, tipoCirugia);
  };

  const analizarExamenes = async (sesion, tipo, comorbilidades, tipoCirugia) => {
    const ctx = ctxRef.current;
    setPregunta(null);
    setFase("analizando");
    setError("");
    await decir(sesion, FRASES.analizandoExamenes);

    idPagoRef.current = `avatar-${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const genero = ctx.sexo === "Femenino" ? "Mujer" : "Hombre";
    let examenes = [];
    let informeIA = "";
    try {
      // El backend exige un nombre: el real se completa al pedir la orden
      const cuerpo = {
        idPago: idPagoRef.current,
        paciente: { nombre: "Paciente", edad: ctx.edad, genero, dolor: ctx.zona || "", lado: ctx.lado || "" },
        comorbilidades,
      };
      const r = tipo === "preop"
        ? await postJSON("/ia-preop", { ...cuerpo, tipoCirugia })
        : await postJSON("/ia-generales", cuerpo);
      if (!r.ok) throw new Error(r.error || "Sin respuesta");
      examenes = (Array.isArray(r.examenesIA) ? r.examenesIA : r.examenes || []).map((e) => String(e).trim()).filter(Boolean);
      informeIA = typeof r.informeIA === "string" ? r.informeIA : "";
      if (!examenes.length) throw new Error("Sin exámenes");
    } catch {
      vigente(sesion);
      setError("No se pudo preparar la propuesta de exámenes.");
      setFase("error");
      await decir(sesion, FRASES.errorExamenes);
      return;
    }
    vigente(sesion);
    examenesRef.current = { examenes, informeIA, comorbilidades, tipoCirugia };
    setInforme({ diagnosticos: [], explicacion: "", examenes, tipoCirugia });
    setFase("resultado");
    await decir(sesion, `${vozExamenes(examenes)} ${FRASES.cierre}`);
    await preguntarOrden(sesion);
  };

  const preguntarOrden = async (sesion) => {
    const { valor } = await preguntarCerrada(sesion, "sino", FRASES.preguntarOrden, FRASES.repreguntarOrden);
    setPregunta(null);
    if (!valor) {
      setFase("fin");
      await decir(sesion, FRASES.sinOrden);
      return;
    }
    setFase("datos");
    await decir(sesion, FRASES.pedirDatos);
  };

  // ---------- flujo de dolor ----------
  const conversar = async (sesion) => {
    const ctx = ctxRef.current;
    const registro = registroRef.current;
    const aplicables = () => PREGUNTAS.filter((p) => !p.aplica || p.aplica(ctx));

    setFase("conversacion");
    await decir(sesion, SALUDO);

    for (const p of PREGUNTAS) {
      if (p.aplica && !p.aplica(ctx)) continue;
      setProgreso(Math.round((aplicables().indexOf(p) / (aplicables().length + 1)) * 100));
      const texto = (p.textoSegun && p.textoSegun(ctx)) || p.texto;

      if (p.tipo === "abierta") {
        const resp = await preguntarAbierta(sesion, texto);
        if (p.opcional && esRespuestaVacia(resp)) continue;
        registro.push({ id: p.id, tipo: "abierta", resumen: p.resumen, pregunta: texto, respuesta: resp });
        continue;
      }

      const { valor, texto: dicho } = await preguntarCerrada(sesion, p.tipo, texto, p.repregunta);
      if (["zona", "lado", "edad", "sexo"].includes(p.tipo)) ctx[p.id] = valor;
      if (p.tipo === "sino") {
        registro.push({ id: p.id, bandera: p.bandera, resumen: p.resumen, pregunta: texto, respuesta: dicho, valor });
        if (valor === true && p.bandera === "grave") {
          setFase("urgencia");
          setPregunta(null);
          await decir(sesion, FRASES.urgencia);
          return;
        }
        if (valor === true && p.bandera === "aviso" && p.mensaje) avisosRef.current.push(p.mensaje);
      }
    }
    setProgreso(100);

    // ---------- puntos dolorosos ----------
    let marcadores;
    const mapperId = resolveZonaKey(ctx.zona);
    if (mapperId && !esColumna(ctx.zona)) {
      setPregunta(null);
      setFase("puntos");
      await decir(sesion, FRASES.puntos);
      const r = await esperarPuntos(sesion);
      const porVista = r && Object.values(r).find((v) => v && typeof v === "object" && v.porVista)?.porVista;
      if (porVista) marcadores = { [mapperId]: porVista };
      else if (r?.puntosSeleccionados?.length) marcadores = { [mapperId]: { puntos: r.puntosSeleccionados } };
    }

    await analizar(sesion, marcadores);
  };

  const analizar = async (sesion, marcadores) => {
    const ctx = ctxRef.current;
    setPregunta(null);
    setFase("analizando");
    setError("");
    await decir(sesion, FRASES.analizando);

    idPagoRef.current = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let resultado;
    try {
      const r = await postJSON("/api/preview-informe", {
        idPago: idPagoRef.current,
        consulta: construirConsulta(ctx, registroRef.current),
        edad: ctx.edad,
        genero: ctx.sexo,
        dolor: ctx.zona,
        lado: ctx.lado || "",
        marcadores: marcadores || undefined,
      });
      if (!r.ok) throw new Error(r.error || "Sin respuesta");
      resultado = leerInforme(r.respuesta, r.examenes);
      if (!resultado.examenes.length && !resultado.diagnosticos.length) throw new Error("Informe vacío");
    } catch (e) {
      vigente(sesion);
      setError("No se pudo generar el prediagnóstico.");
      setFase("error");
      await decir(sesion, FRASES.errorAnalisis);
      return;
    }
    vigente(sesion);
    setInforme({ ...resultado, marcadores, avisos: [...avisosRef.current] });
    // Especialista que corresponde por zona y ubicacion (mismo resolver del backend)
    const deriv = await recomendarEspecialista(ctx.zona);
    vigente(sesion);
    setFase("resultado");

    const voz = [...avisosRef.current, vozResultado(resultado), deriv?.nota || "", FRASES.cierre]
      .filter(Boolean)
      .join(" ");
    await decir(sesion, voz);

    await preguntarOrden(sesion);
  };

  const comenzar = async () => {
    sesionRef.current += 1;
    const sesion = sesionRef.current;
    callar();
    desbloquear();
    limpiarPuntosPrevios();
    ctxRef.current = {};
    registroRef.current = [];
    avisosRef.current = [];
    esperaRef.current = null;
    setEsperando(false);
    puntosRef.current = null;
    setInforme(null);
    setOrdenUrl("");
    setError("");
    setProgreso(0);
    setDerivacion(null);
    setMarcadas([]);
    setSeleccion([]);
    examenesRef.current = {};
    elegirModulo("trauma");
    setAvisoMic("");
    vozOkRef.current = escuchaSoportada;
    if (escuchaSoportada) {
      // Permiso de microfono dentro del toque (el navegador lo exige); si no hay,
      // se avisa y se sigue con botones
      const motivo = await pedirMicrofono();
      if (sesion !== sesionRef.current) return;
      if (motivo) {
        vozOkRef.current = false;
        setAvisoMic(motivo);
      } else {
        escucha.iniciar();
        escucha.pausar();
      }
    } else {
      setAvisoMic("Este navegador no permite hablarle a la asistente. Abre la página en Chrome para usar la voz, o responde con los botones.");
    }
    try {
      await menu(sesion);
    } catch (e) {
      if (!(e instanceof Interrumpido)) {
        console.error(e);
        setError("Ocurrió un problema. Intenta de nuevo.");
        setFase("error");
      }
    }
  };

  const reintentarAnalisis = async () => {
    const sesion = sesionRef.current;
    try {
      await analizar(sesion, informe?.marcadores);
    } catch (e) {
      if (!(e instanceof Interrumpido)) setFase("error");
    }
  };

  // ---------- orden ----------
  const generarOrden = async () => {
    const sesion = sesionRef.current;
    setFase("generando");
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE}${ORDEN[moduloRef.current].pdf(idPagoRef.current)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      if (sesion !== sesionRef.current) return;
      setOrdenUrl(URL.createObjectURL(blob));
      setFase("lista");
      await hablar(conCorreoRef.current ? FRASES.ordenListaCorreo : FRASES.ordenLista);
    } catch {
      setError("No se pudo generar la orden. Intenta de nuevo.");
      setFase("datos");
    }
  };

  const enviarDatos = async (datos) => {
    setError("");
    const ctx = ctxRef.current;
    const geo = leerGeo() || undefined;
    try {
      if (moduloRef.current === "generales" || moduloRef.current === "preop") {
        const ex = examenesRef.current;
        await postJSON(moduloRef.current === "preop" ? "/guardar-datos-preop" : "/guardar-datos-generales", {
          idPago: idPagoRef.current,
          datosPaciente: {
            nombre: datos.nombre, rut: datos.rut, email: datos.email || undefined,
            edad: ctx.edad, genero: ctx.sexo === "Femenino" ? "Mujer" : "Hombre",
            dolor: ctx.zona || undefined, lado: ctx.lado || undefined, geo,
          },
          comorbilidades: ex.comorbilidades,
          tipoCirugia: ex.tipoCirugia || undefined,
          examenesIA: ex.examenes,
          informeIA: ex.informeIA || undefined,
        });
        conCorreoRef.current = Boolean(datos.email);
        setConCorreo(Boolean(datos.email));
        await generarOrden();
        return;
      }
      // geo: para que la orden imprima la derivacion al especialista de su zona
      await postJSON("/api/guardar-datos-ia", {
        idPago: idPagoRef.current,
        datosPaciente: { nombre: datos.nombre, rut: datos.rut, email: datos.email || undefined, geo },
      });
    } catch {
      setError("No se pudieron guardar tus datos. Intenta de nuevo.");
      return;
    }
    conCorreoRef.current = Boolean(datos.email);
    setConCorreo(Boolean(datos.email));
    if (incluyeResonancia(informe?.examenes)) {
      setFase("resonancia");
      await hablar(FRASES.resonancia);
      return;
    }
    await generarOrden();
  };

  const guardarResonancia = async (form) => {
    setError("");
    try {
      await postJSON("/api/guardar-datos-ia", {
        idPago: idPagoRef.current,
        resonanciaChecklist: form,
        resonanciaResumenTexto: resumenRM(form),
      });
    } catch {
      setError("No se pudo guardar el checklist. Intenta de nuevo.");
      return;
    }
    await generarOrden();
  };

  // ---------- render ----------
  const estadoAvatar = hablando ? "hablando" : fase === "analizando" || fase === "generando" ? "pensando"
    : esperando && escucha.escuchando ? "escuchando" : "reposo";

  const soportado = vozSoportada;
  const enCurso = fase !== "inicio";
  const avatarGrande = ["inicio", "conversacion", "urgencia", "fin", "analizando", "derivacion"].includes(fase);

  return (
    <div className="app" style={S.pagina}>
      <header style={S.cabecera}>
        <img src={logoICA} alt="ICA" style={S.logo} />
        <div>
          <p style={S.marca}>Instituto de Cirugía Articular</p>
          <p style={S.sub}>Asistente de consulta</p>
        </div>
      </header>

      <main style={S.main}>
        <div style={{ ...S.avatar, ...(avatarGrande ? {} : S.avatarChico) }}>
          <Avatar estado={estadoAvatar} boca={boca} />
        </div>

        {avisoMic && enCurso && <p style={S.aviso}>{avisoMic}</p>}

        {enCurso && fase === "conversacion" && modulo !== "derivacion" && progreso > 0 && (
          <div style={S.barra}><div style={{ ...S.barraLlena, width: `${progreso}%` }} /></div>
        )}

        {/* ---------- INICIO ---------- */}
        {fase === "inicio" && (
          <section style={S.tarjetaCentro}>
            <h1 style={S.titulo}>Hola, soy tu asistente médica</h1>
            <p style={S.texto}>
              Cuéntame qué necesitas: orientarte por un dolor, exámenes generales, exámenes antes de una
              cirugía u hora con un traumatólogo. Te respondo por voz y, si lo necesitas, te entrego la orden.
            </p>
            <p style={S.legal}>Al comenzar, el navegador te pedirá permiso para usar el micrófono: toca "Permitir".</p>
            {!soportado && (
              <p style={S.aviso}>Tu navegador no permite voz. Igual puedes responder tocando o escribiendo.</p>
            )}
            <button type="button" style={S.btnPrimario} onClick={comenzar}>Comenzar</button>
            <button type="button" style={S.enlace} onClick={onUsarFormulario}>Prefiero usar el formulario</button>
            <p style={S.legal}>Orientación preliminar. No reemplaza la evaluación presencial con un especialista.</p>
          </section>
        )}

        {/* ---------- CONVERSACION ---------- */}
        {fase === "conversacion" && pregunta && (
          <section style={S.tarjeta}>
            <p style={S.preguntaTexto}>{pregunta.texto}</p>

            {vozOkRef.current && esperando && (
              <p style={S.escuchando}>
                {escucha.parcial ? <em>{escucha.parcial}</em> : "Te escucho…"}
              </p>
            )}
            {entendido && <p style={S.entendido}>{entendido}</p>}

            {/* Enfermedades de un grupo: marcar una o varias */}
            {pregunta.tipo === "items" && (
              <>
                <div style={S.opciones}>
                  {pregunta.items.map((it) => {
                    const activo = seleccion.includes(it.key);
                    return (
                      <button key={it.key} type="button"
                        style={{ ...S.opcion, ...(activo ? S.opcionActiva : null) }}
                        onClick={() => setSeleccion((sel) => (activo ? sel.filter((k) => k !== it.key) : [...sel, it.key]))}>
                        {activo ? "✓ " : ""}{it.etiqueta}
                      </button>
                    );
                  })}
                </div>
                <div style={S.opciones}>
                  <button type="button" style={S.btnSecundario} disabled={!seleccion.length}
                    onClick={() => responderEnPantalla(seleccion)}>Listo</button>
                </div>
              </>
            )}

            {/* Respaldo: botones para preguntas cerradas */}
            {pregunta.respaldo && OPCIONES[pregunta.tipo] && (
              <div style={S.opciones}>
                {OPCIONES[pregunta.tipo].map((o) => (
                  <button key={String(o.valor)} type="button" style={S.opcion} onClick={() => responderEnPantalla(o.valor)}>
                    {o.etiqueta}
                  </button>
                ))}
              </div>
            )}
            {pregunta.respaldo && pregunta.tipo === "edad" && (
              <form
                style={S.filaEscribir}
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(edadEscrita);
                  if (Number.isInteger(n) && n > 0 && n <= 110) { responderEnPantalla(n); setEdadEscrita(""); }
                }}
              >
                <input style={S.input} inputMode="numeric" placeholder="Edad" value={edadEscrita}
                  onChange={(e) => setEdadEscrita(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                <button type="submit" style={S.btnSecundario}>Listo</button>
              </form>
            )}

            {marcadas.length > 0 && modulo !== "trauma" && (
              <div style={S.chips}>
                {marcadas.map((m, i) => <span key={i} style={S.chip}>{m}</span>)}
              </div>
            )}

            {/* Respaldo: escribir en vez de hablar (preguntas abiertas) */}
            {pregunta.tipo === "abierta" && (
              <form
                style={S.escribir}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textoLibre.trim()) { responderEnPantalla(textoLibre.trim()); setTextoLibre(""); }
                }}
              >
                <textarea style={S.textarea} rows={2} placeholder="O escribe tu respuesta aquí"
                  value={textoLibre} onChange={(e) => setTextoLibre(e.target.value)} />
                <button type="submit" style={S.btnSecundario} disabled={!textoLibre.trim()}>Enviar</button>
              </form>
            )}
            {pregunta.tipo === "abierta" && pregunta.opcional && (
              <div style={S.opciones}>
                <button type="button" style={S.opcion} onClick={() => responderEnPantalla("no")}>No, nada más</button>
              </div>
            )}
          </section>
        )}

        {/* ---------- PUNTOS DOLOROSOS ---------- */}
        {fase === "puntos" && (
          <section style={S.tarjeta}>
            <p style={S.preguntaTexto}>Marca dónde te duele y toca guardar.</p>
            <GenericMapper
              mapperId={resolveZonaKey(ctxRef.current.zona)}
              ladoInicial={(ctxRef.current.lado || "derecha").toLowerCase()}
              vistaInicial="frente"
              onSave={(r) => terminarPuntos(r)}
              onVolver={() => terminarPuntos(null)}
            />
            <button type="button" style={S.enlace} onClick={() => terminarPuntos(null)}>Omitir este paso</button>
          </section>
        )}

        {fase === "analizando" && <p style={S.estado}>Revisando tu información…</p>}

        {/* ---------- URGENCIA ---------- */}
        {fase === "urgencia" && (
          <section style={{ ...S.tarjetaCentro, ...S.tarjetaAlerta }}>
            <h2 style={S.tituloAlerta}>Necesitas evaluación médica pronto</h2>
            <p style={S.texto}>{FRASES.urgencia}</p>
            <button type="button" style={S.btnSecundario} onClick={comenzar}>Volver a empezar</button>
          </section>
        )}

        {/* ---------- RESULTADO (y pregunta por la orden) ---------- */}
        {informe && ["resultado", "datos", "resonancia", "generando", "lista", "fin"].includes(fase) && (
          <section style={S.tarjeta}>
            {informe.diagnosticos.length > 0 && (
              <>
                <p style={S.rotulo}>Diagnóstico presuntivo</p>
                <ul style={S.lista}>{informe.diagnosticos.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </>
            )}
            {informe.explicacion && (
              <>
                <p style={S.rotulo}>Fundamento</p>
                <p style={S.texto}>{informe.explicacion}</p>
              </>
            )}
            {informe.tipoCirugia && (
              <>
                <p style={S.rotulo}>Cirugía</p>
                <p style={S.texto}>{informe.tipoCirugia}</p>
              </>
            )}
            {modulo !== "trauma" && marcadas.length > 0 && (
              <>
                <p style={S.rotulo}>Antecedentes</p>
                <div style={{ ...S.chips, justifyContent: "flex-start" }}>
                  {marcadas.map((m, i) => <span key={i} style={S.chip}>{m}</span>)}
                </div>
              </>
            )}
            {informe.examenes.length > 0 && (
              <>
                <p style={S.rotulo}>{modulo === "preop" ? "Exámenes preoperatorios" : modulo === "generales" ? "Exámenes generales" : "Exámenes propuestos"}</p>
                <ul style={S.lista}>{informe.examenes.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </>
            )}
            {informe.avisos?.map((m, i) => <p key={i} style={{ ...S.aviso, marginTop: 10 }}>{m}</p>)}
            {derivacion && <TarjetaDerivacion d={derivacion} />}
            <p style={S.legal}>{FRASES.cierre}</p>

            {fase === "resultado" && pregunta && (
              <>
                <p style={S.preguntaTexto}>{pregunta.texto}</p>
                {vozOkRef.current && esperando && (
                  <p style={S.escuchando}>{escucha.parcial ? <em>{escucha.parcial}</em> : "Te escucho…"}</p>
                )}
                <div style={S.opciones}>
                  <button type="button" style={S.opcion} onClick={() => responderEnPantalla(true)}>Sí, quiero la orden</button>
                  <button type="button" style={S.opcion} onClick={() => responderEnPantalla(false)}>No, gracias</button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------- HORA CON TRAUMATOLOGO ---------- */}
        {fase === "derivacion" && (
          <section style={S.tarjetaCentro}>
            {derivacion ? <TarjetaDerivacion d={derivacion} /> : <p style={S.texto}>{FRASES.derivacionError}</p>}
            <a href="https://www.icarticular.cl" target="_blank" rel="noopener noreferrer" style={S.btnPrimario}>Agendar hora</a>
          </section>
        )}

        {fase === "datos" && <FormularioDatos onEnviar={enviarDatos} />}

        {fase === "resonancia" && (
          <section style={S.tarjeta}>
            <FormularioResonancia initial={{}} onSave={(form) => guardarResonancia(form)} onCancel={() => setFase("datos")} />
          </section>
        )}

        {fase === "generando" && <p style={S.estado}>Generando tu orden…</p>}

        {fase === "lista" && ordenUrl && (
          <section style={S.tarjetaCentro}>
            <a href={ordenUrl} download={ORDEN[modulo]?.archivo || "orden_ICA.pdf"} style={S.btnPrimario}>Descargar orden</a>
            {conCorreo && <p style={S.texto}>También te la enviamos por correo.</p>}
          </section>
        )}

        {error && <p style={S.error}>{error}</p>}
        {fase === "error" && (
          <div style={S.opciones}>
            {informe === null && modulo === "trauma" && ctxRef.current.zona && (
              <button type="button" style={S.btnSecundario} onClick={reintentarAnalisis}>Reintentar</button>
            )}
            <button type="button" style={S.btnSecundario} onClick={comenzar}>Volver a empezar</button>
          </div>
        )}

        {["fin", "lista", "derivacion"].includes(fase) && (
          <button type="button" style={S.enlace} onClick={comenzar}>Nueva consulta</button>
        )}
      </main>
    </div>
  );
}

// ---------- especialista recomendado (respuesta de /resolver-derivacion) ----------
function TarjetaDerivacion({ d }) {
  const doc = d.doctor;
  return (
    <div style={S.derivacion}>
      <p style={{ ...S.rotulo, marginTop: 0 }}>Especialista recomendado</p>
      {doc ? (
        <>
          <p style={S.derivNombre}>{doc.nombre}</p>
          {doc.especialidad && <p style={S.texto}>{doc.especialidad}</p>}
          {doc.agenda && <p style={S.texto}>{doc.agenda}</p>}
        </>
      ) : (
        <p style={S.texto}>{d.nota}</p>
      )}
      {!doc && d.sede?.nombre && <p style={S.texto}>{d.sede.nombre}</p>}
      {doc?.contactoWeb && (
        <a href={doc.contactoWeb} target="_blank" rel="noopener noreferrer" style={S.enlace}>Agendar hora</a>
      )}
    </div>
  );
}

// ---------- formulario final (nombre, RUT, correo) ----------
function FormularioDatos({ onEnviar }) {
  const [datos, setDatos] = useState({ nombre: "", rut: "", email: "" });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo, valor) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: "" }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const err = {};
    if (datos.nombre.trim().length < 3) err.nombre = "Ingresa tu nombre completo";
    const errRut = validarRut(datos.rut);
    if (errRut) err.rut = errRut;
    if (datos.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email.trim())) err.email = "Correo inválido";
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    await onEnviar({ nombre: datos.nombre.trim(), rut: formatearRut(datos.rut), email: datos.email.trim() });
    setEnviando(false);
  };

  return (
    <form style={S.tarjeta} onSubmit={enviar} noValidate>
      <p style={S.preguntaTexto}>Datos para tu orden</p>
      <label style={S.campo}>
        <span>Nombre completo</span>
        <input style={S.input} value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} autoComplete="name" />
        {errores.nombre && <small style={S.errorCampo}>{errores.nombre}</small>}
      </label>
      <label style={S.campo}>
        <span>RUT</span>
        <input style={S.input} value={datos.rut} placeholder="12.345.678-9"
          onChange={(e) => cambiar("rut", e.target.value)}
          onBlur={() => datos.rut && cambiar("rut", formatearRut(datos.rut))} />
        {errores.rut && <small style={S.errorCampo}>{errores.rut}</small>}
      </label>
      <label style={S.campo}>
        <span>Correo (para recibir la orden)</span>
        <input style={S.input} type="email" value={datos.email} placeholder="Opcional"
          onChange={(e) => cambiar("email", e.target.value)} autoComplete="email" />
        {errores.email && <small style={S.errorCampo}>{errores.email}</small>}
      </label>
      <button type="submit" style={S.btnPrimario} disabled={enviando}>{enviando ? "Guardando…" : "Continuar"}</button>
    </form>
  );
}

// ---------- estilos (paleta de ICA) ----------
const PRIMARIO = "#1E3A5F";
const ACENTO = "#3F7FBF";
const S = {
  pagina: { minHeight: "100svh", background: "#F4F7FB", color: "#111827", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  cabecera: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#0E1115", color: "#fff" },
  logo: { width: 40, height: 40, objectFit: "cover", borderRadius: 8 },
  marca: { margin: 0, fontWeight: 700, fontSize: 15 },
  sub: { margin: 0, fontSize: 12, color: "#9CA3AF" },
  main: { maxWidth: 560, margin: "0 auto", padding: "16px 16px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  avatar: { width: "min(62vw, 260px)", aspectRatio: "400 / 460", transition: "width 0.3s ease" },
  avatarChico: { width: "min(34vw, 140px)" },
  barra: { width: "100%", height: 6, background: "#D1D8E5", borderRadius: 4, overflow: "hidden" },
  barraLlena: { height: "100%", background: ACENTO, transition: "width 0.4s ease" },
  tarjeta: { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #D1D8E5", borderRadius: 16, padding: 18, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" },
  tarjetaCentro: { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #D1D8E5", borderRadius: 16, padding: 20, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  tarjetaAlerta: { borderColor: "#E5A3A3", background: "#FFF7F7" },
  titulo: { margin: 0, fontSize: 21, color: PRIMARIO },
  tituloAlerta: { margin: 0, fontSize: 19, color: "#9B2C2C" },
  texto: { margin: "4px 0", fontSize: 15, lineHeight: 1.5, color: "#374151" },
  preguntaTexto: { margin: "0 0 10px", fontSize: 18, fontWeight: 600, lineHeight: 1.35, color: PRIMARIO },
  escuchando: { margin: "6px 0", fontSize: 14, color: ACENTO },
  entendido: { margin: "6px 0", fontSize: 15, fontWeight: 600, color: "#065F46", background: "#ECFDF5", borderRadius: 8, padding: "6px 10px" },
  rotulo: { margin: "12px 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#6B7280" },
  lista: { margin: "0 0 4px", paddingLeft: 20, lineHeight: 1.5 },
  opciones: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" },
  opcion: { font: "inherit", fontSize: 15, padding: "10px 16px", borderRadius: 999, border: `1px solid ${ACENTO}`, background: "#fff", color: PRIMARIO, cursor: "pointer" },
  opcionActiva: { background: ACENTO, color: "#fff" },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" },
  chip: { fontSize: 13, padding: "4px 10px", borderRadius: 999, background: "#E8F0FA", color: PRIMARIO },
  derivacion: { marginTop: 12, padding: 12, borderRadius: 12, background: "#F0F6FC", border: "1px solid #CFE0F2", textAlign: "left", width: "100%", boxSizing: "border-box" },
  derivNombre: { margin: "2px 0", fontSize: 17, fontWeight: 700, color: PRIMARIO },
  escribir: { display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" },
  filaEscribir: { display: "flex", gap: 8, marginTop: 10 },
  textarea: { flex: 1, font: "inherit", fontSize: 15, padding: 10, borderRadius: 10, border: "1px solid #D1D8E5", resize: "vertical" },
  input: { font: "inherit", fontSize: 16, padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D8E5", width: "100%", boxSizing: "border-box" },
  campo: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 },
  errorCampo: { color: "#B42318", fontWeight: 500 },
  btnPrimario: { font: "inherit", fontSize: 17, fontWeight: 700, color: "#fff", background: PRIMARIO, border: "none", borderRadius: 12, padding: "14px 28px", cursor: "pointer", textDecoration: "none", display: "inline-block", width: "100%", boxSizing: "border-box", textAlign: "center" },
  btnSecundario: { font: "inherit", fontSize: 15, fontWeight: 600, color: PRIMARIO, background: "#fff", border: `1px solid ${PRIMARIO}`, borderRadius: 10, padding: "10px 18px", cursor: "pointer" },
  enlace: { font: "inherit", fontSize: 14, color: ACENTO, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 6 },
  estado: { fontSize: 15, color: "#6B7280", margin: 0 },
  aviso: { margin: 0, fontSize: 14, color: "#92400E", background: "#FFFBEB", borderRadius: 8, padding: "8px 10px" },
  legal: { margin: "8px 0 0", fontSize: 12, color: "#6B7280" },
  error: { color: "#B42318", fontSize: 14, textAlign: "center", margin: 0 },
};
