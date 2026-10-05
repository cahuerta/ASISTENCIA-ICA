// src/screens/PantallaAvatar.jsx
// Asistente de voz de ICA: la medica dirige la consulta.
//
// 0. Menu (voz o botones): hora con un medico | dolor | examenes generales |
//    examenes para cirugia (preoperatorio). Al terminar cada flujo: "¿Te ayudo
//    en algo mas?" -> vuelve al menu.
//
// DOLOR:
// 1. Anamnesis oral guiada (avatar/bancoPreguntas.js): zona, lado, edad, sexo,
//    banderas rojas (grave -> se detiene y deriva a urgencia) y preguntas abiertas.
//    Si no entiende, repregunta una vez; si vuelve a fallar, ofrece botones.
// 2. Puntos dolorosos en el esquema de la zona (mismos mappers de ICA).
// 3. /api/preview-informe (sin cambios en el backend) con la conversacion completa
//    en "consulta" + edad, sexo, zona, lado y puntos.
// 4. La medica dice el diagnostico presuntivo, el fundamento y los examenes.
// 5. "¿Te hago la orden de examenes, o te busco hora con el especialista?"
//    orden | hora | ambas (primero la orden, luego la hora con sus datos) | ninguna.
//    Orden: formulario escrito (nombre, RUT, correo) -> checklist de resonancia si
//    corresponde -> /api/pdf-ia-orden (gratis por ahora). La ubicacion va a la orden
//    para que salga la derivacion.
//
// EXAMENES GENERALES / PREOPERATORIO (mismos endpoints que los modulos de ICA):
//    edad, sexo, (cirugia y lado), enfermedades por grupos con botones abajo,
//    alergias y otras -> /ia-generales o /ia-preop -> la medica dice los examenes ->
//    "¿quieres la orden?" -> datos -> /guardar-datos-generales|preop -> /pdf-generales|preop.
//
// HORA CON UN MEDICO: reconoce el nombre en la lista de profesionales de la ficha
//    clinica (/professionals publico). Si hay varios, pregunta cual; si no entiende,
//    muestra los medicos como botones; si no sabe, hace el flujo de dolor.
//
// AGENDA: la pagina de reservas de la ficha (reservas.icarticular.cl?modo=asistente)
//    dentro de un iframe: agendas, telemedicina y formulario de ficha completo son los
//    de la ficha. En la URL solo va lo no personal (dr, zona, lat, lon); RUT, nombre y
//    correo van por postMessage. Boton y voz "volver"; a los 2 minutos sin actividad
//    pregunta "¿Ya tomaste una decision?"; al reservar confirma la hora por voz.
//
// ESPALDA: si dice solo "espalda", marca en el dibujo posterior (EsquemaPosterior de
//    ICA) si es cervical, dorsal o lumbar (tambien por voz: cuello / medio / abajo).
//
// SOLO ORDEN: al terminar la orden recomienda al especialista (el mismo que sale
//    impreso en la orden, /resolver-derivacion) y ofrece buscarle hora con el.
//
// WIDGET (?modo=widget dentro de un iframe de icarticular.cl / hipokratia.health):
//    muestra solo una burbuja "¿Te ayudo?"; al tocarla avisa a la pagina para que
//    agrande el iframe y la asistente parte hablando al tiro (el toque ocurre en esta
//    pagina, como exige el navegador para voz y microfono). La ✕ la vuelve a burbuja.
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
  MENU, GRUPOS_COMORBILIDAD, PREGUNTAS_EXTRA, CIRUGIAS, TIPO_EXAMEN, ACCION_FINAL,
} from "../avatar/bancoPreguntas.js";
import {
  interpretarZona, interpretarLado, interpretarEdad, interpretarSexo, interpretarSiNo,
  esRespuestaVacia, construirConsulta, leerInforme, vozResultado, incluyeResonancia,
  formatearRut, validarRut, interpretarMenu, interpretarItems, interpretarCirugia, vozExamenes,
  interpretarTipoExamen, interpretarMedico, interpretarAccionFinal, interpretarVolver, nombreEnVoz,
  interpretarNivelColumna,
} from "../avatar/interpretar.js";
import EsquemaPosterior from "../EsquemaPosterior.jsx";
import GenericMapper from "../mappers/GenericMapper.jsx";
import { resolveZonaKey } from "../mappers/mapperRegistry.js";
import FormularioResonancia from "../components/FormularioResonancia.jsx";
import logoICA from "../assets/ica.jpg";

// import.meta.env sin "?.": Vite solo reemplaza la forma exacta al compilar
// (con "?." las variables VITE_ nunca se aplicaban y siempre quedaba el valor por defecto)
const BACKEND_BASE =
  import.meta.env.VITE_BACKEND_BASE || "https://asistencia-ica-backend.onrender.com";

// Ficha clinica: lista de profesionales (backend) y pagina de reservas (iframe)
const FICHA_API = import.meta.env.VITE_FICHA_API || "https://services.icarticular.cl";
const RESERVAS_URL = import.meta.env.VITE_RESERVAS_URL || "https://reservas.icarticular.cl";
const RESERVAS_ORIGEN = new URL(RESERVAS_URL).origin;

// Sin actividad en la agenda este tiempo -> "¿Ya tomaste una decision?"
const RECORDATORIO_MS = 120000;

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

// ---------- modo widget (burbuja en www.icarticular.cl) ----------
const ORIGEN_WIDGET = /^https:\/\/([a-z0-9-]+\.)*(icarticular\.cl|hipokratia\.health)$/;
const MODO_WIDGET = (() => {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get("modo") === "widget";
  } catch {
    return false;
  }
})();

// Origen de la pagina que contiene la burbuja, solo si es de confianza
function origenWidget() {
  let origen = "";
  try { origen = window.location.ancestorOrigins?.[0] || ""; } catch {}
  if (!origen) { try { origen = new URL(document.referrer).origin; } catch {} }
  return ORIGEN_WIDGET.test(origen) ? origen : null;
}

function avisarWidget(estado) {
  const origen = origenWidget();
  if (MODO_WIDGET && origen) window.parent.postMessage({ fuente: "ica-asistente", tipo: "widget", estado }, origen);
}

// Profesionales publicos de ICA en la ficha clinica: [{ id, name, specialty }]
async function cargarMedicos() {
  try {
    const res = await fetch(`${FICHA_API}/professionals?public=true&scope=ica`);
    if (!res.ok) return [];
    const data = await res.json();
    const lista = Array.isArray(data) ? data : Array.isArray(data?.professionals) ? data.professionals : [];
    return lista
      .filter((p) => p && p.id && p.name)
      .map((p) => ({ id: String(p.id), name: String(p.name), specialty: String(p.specialty || "") }));
  } catch {
    return [];
  }
}

// Coordenadas para buscar especialistas cerca (sin pedir de nuevo si ya las negó).
// Redondeadas a ~1 km: solo sirven para saber la region.
function obtenerCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: Math.round(pos.coords.latitude * 100) / 100,
        lon: Math.round(pos.coords.longitude * 100) / 100,
      }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 },
    );
  });
}

// "2026-10-06" -> "martes 6 de octubre"
function fechaEnVoz(fecha) {
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
}

// Solo se acepta una reserva con forma valida desde la pagina de reservas
function leerReserva(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || "") || !/^\d{1,2}:\d{2}$/.test(d.time || "")) return null;
  return {
    date: d.date,
    time: d.time,
    professionalName: typeof d.professionalName === "string" ? d.professionalName.slice(0, 120) : "",
    tipo: d.modalidad === "telemedicina" ? "telemedicina" : "presencial",
  };
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
  // inicio | conversacion | puntos | analizando | resultado | datos | resonancia | generando | lista | agenda | urgencia | fin | error
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
  const [modulo, setModulo] = useState("trauma");     // trauma | generales | preop | hora
  const [agenda, setAgenda] = useState(null);         // { url } de la pagina de reservas
  const [reserva, setReserva] = useState(null);       // hora reservada { date, time, professionalName, tipo }
  const [resumen, setResumen] = useState(false);      // muestra orden/hora al preguntar "¿algo mas?"
  const [abierto, setAbierto] = useState(!MODO_WIDGET); // widget: burbuja cerrada / asistente abierta

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
  const ordenRef = useRef(null);               // resolver: la orden quedo lista
  const datosRef = useRef(null);               // { nombre, rut, email } que dio para la orden
  const iframeRef = useRef(null);
  const agendaRef = useRef(null);              // resolver mientras la agenda esta abierta
  const actividadRef = useRef(null);           // reinicia el recordatorio de la agenda
  const prefillRef = useRef(null);             // datos que se mandan a la agenda por postMessage
  const pendienteRef = useRef({});             // { volver, reservado } llegados mientras hablaba

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

  // ---------- mensajes de la pagina de reservas (solo de su origen y de nuestro iframe) ----------
  useEffect(() => {
    const alMensaje = (e) => {
      if (e.origin !== RESERVAS_ORIGEN) return;
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const d = e.data;
      if (!d || d.fuente !== "ica-reservas") return;
      if (d.tipo === "listo" && prefillRef.current) {
        iframeRef.current.contentWindow.postMessage(
          { fuente: "ica-asistente", tipo: "paciente", datos: prefillRef.current }, RESERVAS_ORIGEN,
        );
      } else if (d.tipo === "actividad") {
        actividadRef.current?.();
      } else if (d.tipo === "reservado") {
        const r = leerReserva(d);
        if (!r) return;
        if (agendaRef.current) agendaRef.current({ reservado: r });
        else pendienteRef.current.reservado = r;
      }
    };
    window.addEventListener("message", alMensaje);
    return () => window.removeEventListener("message", alMensaje);
  }, []);

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
    tipoExamen: interpretarTipoExamen,
    accion: interpretarAccionFinal,
    columna: interpretarNivelColumna,
    cirugia: (t) => interpretarCirugia(t)?.valor || null,
  };

  const OPCIONES = {
    zona: ZONAS.map((z) => ({ etiqueta: z, valor: z })),
    lado: [{ etiqueta: "Derecho", valor: "Derecha" }, { etiqueta: "Izquierdo", valor: "Izquierda" }],
    sexo: [{ etiqueta: "Hombre", valor: "Masculino" }, { etiqueta: "Mujer", valor: "Femenino" }],
    sino: [{ etiqueta: "Sí", valor: true }, { etiqueta: "No", valor: false }],
    menu: MENU.opciones,
    tipoExamen: TIPO_EXAMEN.opciones,
    accion: ACCION_FINAL.opciones,
    columna: [
      { etiqueta: "Cuello", valor: "Columna cervical" },
      { etiqueta: "Parte media", valor: "Columna dorsal" },
      { etiqueta: "Parte baja", valor: "Columna lumbar" },
    ],
    cirugia: CIRUGIAS.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor })),
  };

  const MOSTRAR = {
    zona: (v) => v,
    lado: (v) => (v === "Derecha" ? "Lado derecho" : "Lado izquierdo"),
    edad: (v) => `${v} años`,
    sexo: (v) => (v === "Masculino" ? "Hombre" : "Mujer"),
    sino: (v) => (v ? "Sí" : "No"),
    menu: (v) => (v === "examenes" ? "Exámenes" : MENU.opciones.find((o) => o.valor === v)?.etiqueta || v),
    tipoExamen: (v) => TIPO_EXAMEN.opciones.find((o) => o.valor === v)?.etiqueta || v,
    accion: (v) => ACCION_FINAL.opciones.find((o) => o.valor === v)?.etiqueta || v,
    columna: (v) => v,
    medico: (v) => (v.medico ? v.medico.name : v.varios ? v.varios.map((m) => m.name).join(" o ") : "No sé con quién"),
    cirugia: (v) => CIRUGIAS.find((c) => c.valor === v)?.etiqueta || v,
  };

  // Pregunta cerrada: voz -> si no entiende repregunta -> si falla de nuevo, botones.
  // siempreBotones: los botones se ven desde el inicio (menu, enfermedades, cirugia).
  // interprete: reemplaza al interprete del tipo (ej. grupo de enfermedades).
  // opciones: botones propios (ej. la lista de medicos).
  const preguntarCerrada = async (sesion, tipo, texto, repregunta, siempreBotones = false, interprete = null, opciones = null) => {
    let intentos = 0;
    let dicho = texto;
    for (;;) {
      const respaldo = siempreBotones || !vozOkRef.current || intentos >= 2;
      setPregunta({ texto, tipo, respaldo, opciones });
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

  // Cada opcion del menu empieza limpia (se conservan la orden, la hora y los datos)
  const nuevoFlujo = () => {
    limpiarPuntosPrevios();
    ctxRef.current = {};
    registroRef.current = [];
    avisosRef.current = [];
    examenesRef.current = {};
    setInforme(null);
    setMarcadas([]);
    setSeleccion([]);
    setError("");
  };

  const menu = async (sesion, texto = MENU.texto) => {
    setFase("conversacion");
    setProgreso(0);
    setResumen(false);
    let { valor } = await preguntarCerrada(sesion, "menu", texto, MENU.repregunta, true);
    setEntendido("");
    nuevoFlujo();
    if (valor === "examenes") {
      ({ valor } = await preguntarCerrada(sesion, "tipoExamen", TIPO_EXAMEN.texto, TIPO_EXAMEN.repregunta, true));
      setEntendido("");
    }
    elegirModulo(valor === "dolor" ? "trauma" : valor);
    if (valor === "generales" || valor === "preop") return flujoExamenes(sesion, valor);
    if (valor === "hora") return flujoHora(sesion);
    return conversar(sesion);
  };

  // ---------- "¿Te ayudo en algo mas?" ----------
  const algoMas = async (sesion) => {
    setFase("conversacion");
    setProgreso(0);
    setResumen(true);
    const { valor } = await preguntarCerrada(sesion, "sino", FRASES.algoMas, FRASES.repreguntaAlgoMas, true);
    if (valor) return menu(sesion, MENU.otraVez);
    setPregunta(null);
    setFase("fin");
    await decir(sesion, FRASES.despedida);
  };

  // ---------- hora con un medico ----------
  const flujoHora = async (sesion) => {
    const medicos = await cargarMedicos();
    vigente(sesion);
    if (!medicos.length) {
      await decir(sesion, FRASES.sinMedicos);
      return abrirAgenda(sesion, {});
    }
    const botones = [
      ...medicos.map((m) => ({ etiqueta: m.name, valor: { medico: m } })),
      { etiqueta: "No sé con quién", valor: { nosabe: true, zona: null } },
    ];
    let { valor } = await preguntarCerrada(
      sesion, "medico", FRASES.queMedico, FRASES.repreguntaMedico, false,
      (t) => interpretarMedico(t, medicos), botones,
    );
    if (valor.varios) {
      const lista = valor.varios;
      ({ valor } = await preguntarCerrada(
        sesion, "medico", FRASES.cualMedico, FRASES.repreguntaCualMedico, true,
        (t) => { const r = interpretarMedico(t, lista); return r?.medico ? r : null; },
        lista.map((m) => ({ etiqueta: m.name, valor: { medico: m } })),
      ));
    }
    if (valor.medico) return abrirAgenda(sesion, { medico: valor.medico });

    // No sabe con quien: flujo de dolor completo (si ya dijo la zona, no se repregunta)
    if (valor.zona) ctxRef.current.zona = valor.zona;
    elegirModulo("trauma");
    setEntendido("");
    await decir(sesion, FRASES.ayudaDolor);
    return conversar(sesion, { sinSaludo: true });
  };

  // ---------- agenda de la ficha clinica (iframe) ----------
  const esperarAgenda = (sesion) =>
    new Promise((resolve) => {
      let timer = null;
      const fin = (r) => {
        if (agendaRef.current !== fin) return;
        clearTimeout(timer);
        agendaRef.current = null;
        actividadRef.current = null;
        esperaRef.current = null;
        setEsperando(false);
        escuchaRef.current?.pausar();
        resolve(r);
      };
      const armar = () => {
        clearTimeout(timer);
        timer = setTimeout(() => fin({ recordatorio: true }), RECORDATORIO_MS);
      };
      agendaRef.current = fin;
      actividadRef.current = armar;
      esperaRef.current = fin; // voz y boton "volver"
      setEsperando(true);
      if (vozOkRef.current) escuchaRef.current?.reanudar();
      armar();
    }).then((r) => {
      vigente(sesion);
      return r;
    });

  // Boton "Volver con la asistente": funciona aunque ella este hablando
  const volverDeAgenda = () => {
    if (agendaRef.current) agendaRef.current({ valor: "volver", texto: "volver" });
    else {
      pendienteRef.current.volver = true;
      callar();
    }
  };

  const abrirAgenda = async (sesion, { medico = null, zona = null }) => {
    const q = new URLSearchParams({ modo: "asistente" });
    if (medico) q.set("dr", medico.id);
    else {
      if (zona) q.set("zona", zona);
      const coords = await obtenerCoords();
      vigente(sesion);
      if (coords) { q.set("lat", String(coords.lat)); q.set("lon", String(coords.lon)); }
    }
    // Datos personales solo por postMessage, nunca en la URL
    const d = datosRef.current;
    const sexo = ctxRef.current.sexo || "";
    prefillRef.current = d || sexo ? { rut: d?.rut || "", nombre: d?.nombre || "", email: d?.email || "", sexo } : null;
    pendienteRef.current = {};

    setPregunta(null);
    setEntendido("");
    setProgreso(0);
    setAgenda({ url: `${RESERVAS_URL}/?${q.toString()}` });
    setFase("agenda");
    await decir(sesion, medico ? FRASES.agendaMedico(nombreEnVoz(medico.name))
      : zona ? FRASES.agendaZona(zona.toLowerCase()) : FRASES.agendaGeneral);

    for (;;) {
      const p = pendienteRef.current;
      pendienteRef.current = {};
      const r = p.reservado ? { reservado: p.reservado } : p.volver ? { valor: "volver" } : await esperarAgenda(sesion);

      if (r.reservado) {
        setAgenda(null);
        setReserva(r.reservado);
        setFase("conversacion");
        await decir(sesion, FRASES.horaReservada(
          `${fechaEnVoz(r.reservado.date)} a las ${r.reservado.time}`,
          nombreEnVoz(r.reservado.professionalName),
          r.reservado.tipo === "telemedicina",
        ));
        return algoMas(sesion);
      }
      if (r.recordatorio) {
        await decir(sesion, FRASES.recordatorioAgenda);
        continue;
      }
      const accion = r.valor || interpretarVolver(r.texto);
      if (accion === "volver") {
        setAgenda(null);
        return menu(sesion, MENU.volver);
      }
      if (accion === "seguir") await decir(sesion, FRASES.seguirAgenda);
      // cualquier otra frase se ignora: sigue escuchando
    }
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
    if (valor) await pedirOrden(sesion);
    else await decir(sesion, FRASES.sinOrden);
    return algoMas(sesion);
  };

  // Formulario de datos -> (resonancia) -> PDF. Termina cuando la orden esta lista.
  const pedirOrden = async (sesion) => {
    const lista = new Promise((resolve) => { ordenRef.current = resolve; });
    setFase("datos");
    await decir(sesion, FRASES.pedirDatos);
    await lista;
    vigente(sesion);
  };

  // Final del flujo de dolor: orden | hora | ambas | ninguna
  const accionFinal = async (sesion) => {
    const { valor } = await preguntarCerrada(sesion, "accion", ACCION_FINAL.texto, ACCION_FINAL.repregunta, true);
    setPregunta(null);
    if (valor === "ninguna") {
      await decir(sesion, FRASES.sinOrden);
      return algoMas(sesion);
    }
    if (valor === "orden" || valor === "ambas") await pedirOrden(sesion);
    if (valor === "hora" || valor === "ambas") {
      if (valor === "ambas") await decir(sesion, FRASES.ahoraHora);
      return abrirAgenda(sesion, { zona: ctxRef.current.zona });
    }
    return recomendarEspecialista(sesion);
  };

  // Solo pidio la orden: recomienda al especialista (el mismo que sale impreso en
  // la orden) y ofrece buscarle hora con el
  const recomendarEspecialista = async (sesion) => {
    const zona = ctxRef.current.zona;
    let doctor = null;
    try {
      const r = await postJSON("/resolver-derivacion", { dolor: zona, geo: leerGeo() || undefined });
      doctor = r?.doctor?.nombre ? r.doctor : null;
    } catch {
      // sin recomendacion: igual se ofrece hora con un especialista
    }
    vigente(sesion);
    setFase("conversacion");
    setProgreso(0);
    setResumen(true);
    const texto = doctor
      ? FRASES.recomendar(nombreEnVoz(doctor.nombre), String(zona || "").toLowerCase())
      : FRASES.recomendarSinMedico;
    const { valor } = await preguntarCerrada(sesion, "sino", texto, FRASES.repreguntaRecomendar, true);
    setPregunta(null);
    if (!valor) return algoMas(sesion);
    // El recomendado en la agenda de la ficha (si no esta, los especialistas de la zona)
    let medico = null;
    if (doctor) {
      const medicos = await cargarMedicos();
      vigente(sesion);
      medico = interpretarMedico(doctor.nombre, medicos)?.medico || null;
    }
    return abrirAgenda(sesion, medico ? { medico } : { zona });
  };

  // Dijo solo "espalda": marca en el dibujo posterior (o dice) cervical, dorsal o lumbar
  const elegirNivelColumna = async (sesion) => {
    const { valor } = await preguntarCerrada(
      sesion, "columna", FRASES.nivelColumna, FRASES.repreguntaNivelColumna, true,
    );
    return valor;
  };

  // ---------- flujo de dolor ----------
  // sinSaludo: viene de "no se con que medico" (ya se le explico)
  const conversar = async (sesion, { sinSaludo = false } = {}) => {
    const ctx = ctxRef.current;
    const registro = registroRef.current;
    const aplicables = () => PREGUNTAS.filter((p) => !p.aplica || p.aplica(ctx));

    setFase("conversacion");
    if (!sinSaludo) await decir(sesion, SALUDO);

    for (const p of PREGUNTAS) {
      if (p.aplica && !p.aplica(ctx)) continue;
      if (p.id === "zona" && ctx.zona) {
        // ya la dijo al pedir hora; si fue solo "espalda", se precisa en el dibujo
        if (ctx.zona === "Espalda") ctx.zona = await elegirNivelColumna(sesion);
        continue;
      }
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
      if (p.tipo === "zona" && valor === "Espalda") ctx.zona = await elegirNivelColumna(sesion);
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
    setFase("resultado");

    const voz = [...avisosRef.current, vozResultado(resultado), FRASES.cierre]
      .filter(Boolean)
      .join(" ");
    await decir(sesion, voz);

    await accionFinal(sesion);
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
    setMarcadas([]);
    setSeleccion([]);
    examenesRef.current = {};
    ordenRef.current = null;
    datosRef.current = null;
    agendaRef.current = null;
    actividadRef.current = null;
    prefillRef.current = null;
    pendienteRef.current = {};
    setAgenda(null);
    setReserva(null);
    setResumen(false);
    setConCorreo(false);
    conCorreoRef.current = false;
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
      setAvisoMic("Este navegador no permite hablarle a Ipo. Abre la página en Chrome para usar la voz, o responde con los botones.");
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
      // el flujo sigue (hora con el especialista o "¿algo mas?")
      const listo = ordenRef.current;
      ordenRef.current = null;
      listo?.();
    } catch {
      setError("No se pudo generar la orden. Intenta de nuevo.");
      setFase("datos");
    }
  };

  const enviarDatos = async (datos) => {
    setError("");
    datosRef.current = datos; // para prellenar la reserva si tambien pide hora
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

  // ---------- widget ----------
  useEffect(() => {
    if (!MODO_WIDGET) return;
    // La burbuja flota sobre la pagina: fondo transparente
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  // El toque ocurre en esta pagina: la voz y el microfono quedan autorizados
  const abrirWidget = () => {
    setAbierto(true);
    avisarWidget("abierto");
    comenzar();
  };

  const cerrarWidget = () => {
    sesionRef.current += 1; // corta la conversacion en curso
    callar();
    escuchaRef.current?.pausar();
    esperaRef.current = null;
    agendaRef.current = null;
    actividadRef.current = null;
    setEsperando(false);
    setPregunta(null);
    setAgenda(null);
    setFase("inicio");
    setAbierto(false);
    avisarWidget("cerrado");
  };

  const soportado = vozSoportada;
  const enCurso = fase !== "inicio";
  const avatarGrande = ["inicio", "conversacion", "urgencia", "fin", "analizando"].includes(fase) && !resumen;
  const verResumen = resumen && ["conversacion", "fin"].includes(fase);

  if (MODO_WIDGET && !abierto) {
    return (
      <div style={S.widgetCaja}>
        <button type="button" style={S.widgetBoton} onClick={abrirWidget} aria-label="Abrir a Ipo, el asistente">
          <span style={S.widgetCara}><Avatar estado="reposo" boca={0} /></span>
          <span style={S.widgetTexto}>¿Te ayudo?</span>
        </button>
      </div>
    );
  }

  return (
    <div className="app" style={{ ...S.pagina, ...(fase === "agenda" || MODO_WIDGET ? S.paginaAncha : null) }}>
      <header style={S.cabecera}>
        <img src={logoICA} alt="ICA" style={S.logo} />
        <div style={{ flex: 1 }}>
          <p style={S.marca}>Instituto de Cirugía Articular</p>
          <p style={S.sub}>Ipo · Asistente virtual</p>
        </div>
        {MODO_WIDGET && (
          <button type="button" style={S.cerrar} onClick={cerrarWidget} aria-label="Cerrar a Ipo">✕</button>
        )}
      </header>

      <main style={{ ...S.main, ...(fase === "agenda" ? S.mainAgenda : null) }}>
        {fase !== "agenda" && (
          <div style={{ ...S.avatar, ...(avatarGrande ? {} : S.avatarChico) }}>
            <Avatar estado={estadoAvatar} boca={boca} />
          </div>
        )}

        {avisoMic && enCurso && <p style={S.aviso}>{avisoMic}</p>}

        {enCurso && fase === "conversacion" && modulo !== "hora" && progreso > 0 && (
          <div style={S.barra}><div style={{ ...S.barraLlena, width: `${progreso}%` }} /></div>
        )}

        {/* ---------- INICIO ---------- */}
        {fase === "inicio" && (
          <section style={S.tarjetaCentro}>
            <h1 style={S.titulo}>Hola, soy Ipo, tu asistente virtual</h1>
            <p style={S.texto}>
              Cuéntame qué necesitas: una hora con un médico, orientarte por un dolor, o exámenes generales
              o para una cirugía. Te respondo por voz, te entrego la orden y te ayudo a reservar tu hora.
            </p>
            <p style={S.legal}>Al comenzar, el navegador te pedirá permiso para usar el micrófono: toca "Permitir".</p>
            {!soportado && (
              <p style={S.aviso}>Tu navegador no permite voz. Igual puedes responder tocando o escribiendo.</p>
            )}
            <button type="button" style={S.btnPrimario} onClick={comenzar}>Comenzar</button>
            {!MODO_WIDGET && (
              <button type="button" style={S.enlace} onClick={onUsarFormulario}>Prefiero usar el formulario</button>
            )}
            <p style={S.legal}>Orientación preliminar. No reemplaza la evaluación presencial con un especialista.</p>
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

        {/* ---------- RESULTADO (y pregunta por la orden / la hora) ---------- */}
        {informe && (["resultado", "datos", "resonancia", "generando", "lista", "fin"].includes(fase) || verResumen) && (
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
            <p style={S.legal}>{FRASES.cierre}</p>

            {fase === "resultado" && pregunta && (
              <>
                <p style={S.preguntaTexto}>{pregunta.texto}</p>
                {vozOkRef.current && esperando && (
                  <p style={S.escuchando}>{escucha.parcial ? <em>{escucha.parcial}</em> : "Te escucho…"}</p>
                )}
                {entendido && <p style={S.entendido}>{entendido}</p>}
                <div style={S.opciones}>
                  {(pregunta.tipo === "accion" ? ACCION_FINAL.opciones : [
                    { etiqueta: "Sí, quiero la orden", valor: true },
                    { etiqueta: "No, gracias", valor: false },
                  ]).map((o, i) => (
                    <button key={i} type="button" style={S.opcion} onClick={() => responderEnPantalla(o.valor)}>{o.etiqueta}</button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------- LO QUE YA QUEDO LISTO (al preguntar "¿algo mas?" y al final) ---------- */}
        {verResumen && (reserva || ordenUrl) && (
          <section style={S.tarjeta}>
            {reserva && (
              <>
                <p style={{ ...S.rotulo, marginTop: 0 }}>Tu hora reservada</p>
                {reserva.professionalName && <p style={S.derivNombre}>{reserva.professionalName}</p>}
                <p style={S.texto}>
                  {fechaEnVoz(reserva.date).replace(/^./, (c) => c.toUpperCase())} · {reserva.time} · {reserva.tipo === "telemedicina" ? "Telemedicina" : "Presencial"}
                </p>
                <p style={S.legal}>Te llegará la confirmación por correo.</p>
              </>
            )}
            {ordenUrl && (
              <a href={ordenUrl} download={ORDEN[modulo]?.archivo || "orden_ICA.pdf"} style={{ ...S.btnSecundario, display: "inline-block", marginTop: reserva ? 12 : 0, textDecoration: "none" }}>
                Descargar orden
              </a>
            )}
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
            {pregunta.respaldo && (pregunta.opciones || OPCIONES[pregunta.tipo]) && (
              <div style={S.opciones}>
                {(pregunta.opciones || OPCIONES[pregunta.tipo]).map((o, i) => (
                  <button key={i} type="button" style={S.opcion} onClick={() => responderEnPantalla(o.valor)}>
                    {o.etiqueta}
                  </button>
                ))}
              </div>
            )}
            {/* Espalda: dibujo posterior, solo la columna se puede marcar */}
            {pregunta.tipo === "columna" && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
                <EsquemaPosterior
                  width={300}
                  onSeleccionZona={(z) => { if (String(z).startsWith("Columna")) responderEnPantalla(z); }}
                />
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

        {/* ---------- AGENDA DE LA FICHA CLINICA ---------- */}
        {fase === "agenda" && agenda && (
          <section style={S.agenda}>
            {/* Barra compacta: la agenda usa casi toda la pantalla */}
            <div style={S.agendaBarra}>
              <div style={S.avatarMini}><Avatar estado={estadoAvatar} boca={boca} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button type="button" style={S.btnSecundario} onClick={volverDeAgenda}>← Volver con Ipo</button>
                {vozOkRef.current && esperando && <p style={{ ...S.escuchando, margin: "4px 0 0", fontSize: 12 }}>O dime "volver".</p>}
              </div>
              {ordenUrl && (
                <a href={ordenUrl} download={ORDEN.trauma.archivo} style={S.enlace}>Descargar orden</a>
              )}
            </div>
            <iframe ref={iframeRef} src={agenda.url} title="Agenda de horas" style={S.iframe} />
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

        {fase === "fin" && (
          <button type="button" style={S.enlace} onClick={comenzar}>Nueva consulta</button>
        )}
      </main>
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
  // agenda y widget: sin los margenes de .app (en el celular la agenda quedaba angosta)
  paginaAncha: { padding: 0, maxWidth: "none" },
  mainAgenda: { maxWidth: 980, width: "100%", boxSizing: "border-box", padding: "10px 8px 12px" },
  cerrar: { font: "inherit", fontSize: 20, lineHeight: 1, color: "#fff", background: "transparent", border: "1px solid #4B5563", borderRadius: 10, padding: "8px 12px", cursor: "pointer" },
  widgetCaja: { position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: 6, boxSizing: "border-box", background: "transparent" },
  widgetBoton: { display: "flex", alignItems: "center", gap: 8, font: "inherit", fontSize: 15, fontWeight: 700, color: "#fff", background: PRIMARIO, border: "none", borderRadius: 999, padding: "6px 16px 6px 6px", cursor: "pointer", boxShadow: "0 6px 18px rgba(15,23,42,0.30)" },
  widgetCara: { width: 52, aspectRatio: "400 / 460", display: "block", background: "#fff", borderRadius: 999, overflow: "hidden" },
  widgetTexto: { whiteSpace: "nowrap" },
  agenda: { width: "100%", display: "flex", flexDirection: "column", gap: 8 },
  agendaBarra: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  avatarMini: { width: 52, aspectRatio: "400 / 460", flexShrink: 0 },
  iframe: { width: "100%", height: "calc(100svh - 170px)", minHeight: 480, border: "1px solid #D1D8E5", borderRadius: 16, background: "#fff" },
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
