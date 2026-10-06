// src/asistentes/comun/PantallaAsistentes.jsx
// La pantalla donde atienden los asistentes de voz de ICA: Ica (recepcion) e Ipo
// (dolor y examenes). Aqui esta lo comun: la voz y el microfono, como se pregunta
// (por voz, repregunta y botones), los puntos dolorosos, la agenda en un iframe,
// la orden para descargar, la burbuja de la pagina principal y el dibujo de quien
// esta atendiendo. Lo que hace cada uno esta en su carpeta:
//   ica/flujoIca.js  (recepcion, hora, pasar a Ipo)   ica/textosIca.js  ica/AvatarIca.jsx
//   ipo/flujoIpo.js  (dolor, examenes, orden)         ipo/textosIpo.js  ipo/AvatarIpo.jsx
//   comun/agenda.js  (buscar hora con un medico, la usan los dos)
//
// QUIEN RECIBE: Ica en la burbuja de la pagina principal (?modo=widget) o con
// ?asistente=ica; Ipo entrando directo a app.icarticular.cl (como antes).
// Ica e Ipo se pasan al paciente en esta misma pantalla (pasarA): no viaja nada.
//
// MISALUD (?modo=misalud&motivo=dolor|generales|preop|hora dentro de un iframe de
//    misalud.icarticular.cl): el asistente de MiSalud (Katia, o como el paciente lo
//    llame) le pasa el paciente a Ipo (dolor, examenes) o a Ica (hora). Los datos
//    (nombre, RUT, correo, edad, sexo, zona y lado) llegan por postMessage, nunca en
//    la URL, y solo desde un origen de confianza: no se vuelven a preguntar y la
//    orden sale sin el formulario. Al terminar avisa "terminado" a MiSalud; la ✕
//    avisa "cerrar".
//
// WIDGET (?modo=widget dentro de un iframe de icarticular.cl / hipokratia.health):
//    muestra solo una burbuja "¿Te ayudo?"; al tocarla avisa a la pagina para que
//    agrande el iframe y el asistente parte hablando al tiro (el toque ocurre en esta
//    pagina, como exige el navegador para voz y microfono). La ✕ la vuelve a burbuja.
//
// MICROFONO: al tocar "Comenzar" se pide permiso con getUserMedia (dentro del toque,
// como exige el navegador). Si no hay permiso o microfono, se avisa en pantalla y
// todo sigue con botones y texto. Si el paciente no responde en 10 s, aparecen
// los botones igual.
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "../../app.css";
import AvatarIca from "../ica/AvatarIca.jsx";
import AvatarIpo from "../ipo/AvatarIpo.jsx";
import { PERSONAJE_ICA, MENU_ICA } from "../ica/textosIca.js";
import { PERSONAJE_IPO, MENU, ACCION_FINAL, FRASES } from "../ipo/textosIpo.js";
import { ZONAS, PREGUNTAS_EXTRA, CIRUGIAS } from "../ipo/bancoPreguntas.js";
import { FRASES_COMUNES, TIPO_EXAMEN } from "./textosComunes.js";
import { crearFlujoIca } from "../ica/flujoIca.js";
import { crearFlujoIpo, ORDEN, ZONAS_MAPPER, limpiarPuntosPrevios } from "../ipo/flujoIpo.js";
import { crearAgenda, RESERVAS_ORIGEN, leerReserva, fechaEnVoz } from "./agenda.js";
import useVoz, { vozSoportada } from "./useVoz.js";
import useEscucha, { escuchaSoportada } from "./useEscucha.js";
import {
  interpretarZona, interpretarLado, interpretarEdad, interpretarSexo, interpretarSiNo,
  formatearRut, validarRut, interpretarMenu, interpretarItems, interpretarCirugia,
  interpretarTipoExamen, interpretarAccionFinal, interpretarNivelColumna,
} from "./interpretar.js";
import EsquemaPosterior from "../../EsquemaPosterior.jsx";
import GenericMapper from "../../mappers/GenericMapper.jsx";
import { resolveZonaKey } from "../../mappers/mapperRegistry.js";
import FormularioResonancia from "../../components/FormularioResonancia.jsx";
import logoICA from "../../assets/ica.jpg";

// Quien es quien (nombre, rol y voz de cada asistente)
const PERSONAJES = { ica: PERSONAJE_ICA, ipo: PERSONAJE_IPO };

// Sin respuesta en este tiempo, aparecen los botones aunque haya voz
const BOTONES_TRAS_MS = 10000;

// ---------- modo widget (burbuja en www.icarticular.cl) ----------
const ORIGEN_WIDGET = /^https:\/\/([a-z0-9-]+\.)*(icarticular\.cl|hipokratia\.health)$/;
const MODO_WIDGET = (() => {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get("modo") === "widget";
  } catch {
    return false;
  }
})();

// ---------- modo MiSalud (dentro del portal del paciente) ----------
const MODO_MISALUD = (() => {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get("modo") === "misalud";
  } catch {
    return false;
  }
})();
const MOTIVO_MISALUD = (() => {
  try {
    const m = new URLSearchParams(window.location.search).get("motivo") || "";
    return ["dolor", "generales", "preop", "hora"].includes(m) ? m : "";
  } catch {
    return "";
  }
})();

// Quien recibe al paciente: Ica en la burbuja de la pagina principal (o con
// ?asistente=ica, o desde MiSalud para una hora); Ipo entrando directo a la app
const PERSONAJE_INICIAL = (() => {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("asistente") === "ica" || q.get("asistente") === "ipo") return q.get("asistente");
  } catch {}
  if (MODO_MISALUD) return MOTIVO_MISALUD === "hora" ? "ica" : "ipo";
  return MODO_WIDGET ? "ica" : "ipo";
})();

// Datos que manda MiSalud: solo lo esperado y con forma valida
function leerDatosMiSalud(d) {
  if (!d || typeof d !== "object") return null;
  const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const edad = Number(d.edad);
  const zona = ZONAS.includes(d.zona) ? d.zona : "";
  return {
    quien: texto(d.quien, 20) || "tu asistente de MiSalud",
    nombre: texto(d.nombre, 120),
    rut: texto(d.rut, 12),
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto(d.email, 120)) ? texto(d.email, 120) : "",
    edad: Number.isInteger(edad) && edad > 0 && edad <= 110 ? edad : null,
    sexo: d.sexo === "Masculino" || d.sexo === "Femenino" ? d.sexo : "",
    zona,
    lado: zona && !zona.startsWith("Columna") && (d.lado === "Derecha" || d.lado === "Izquierda") ? d.lado : "",
  };
}

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

// Avisos a MiSalud: "listo" (esperando los datos), "terminado", "cerrar"
function avisarMiSalud(tipo, extra = {}) {
  const origen = origenWidget();
  if (MODO_MISALUD && origen) window.parent.postMessage({ fuente: "ica-asistente", tipo, ...extra }, origen);
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

class Interrumpido extends Error {}

export default function PantallaAsistentes({ onUsarFormulario }) {
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
  const [personaje, setPersonaje] = useState(PERSONAJE_INICIAL); // "ica" | "ipo": quien habla ahora
  const [misalud, setMisalud] = useState(null);       // datos que mando MiSalud (modo misalud)

  const { hablar, callar, desbloquear, usarVoz, hablando, boca } = useVoz();

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
  const personajeRef = useRef(PERSONAJE_INICIAL);
  const misaludRef = useRef(null);
  const desdeIcaRef = useRef(false);           // Ipo atiende porque Ica se lo paso

  // Cambia quien habla: dibujo, nombre y voz
  const cambiarPersonaje = useCallback((p) => {
    personajeRef.current = p;
    setPersonaje(p);
    usarVoz(PERSONAJES[p].voz);
  }, [usarVoz]);

  useEffect(() => { usarVoz(PERSONAJES[PERSONAJE_INICIAL].voz); }, [usarVoz]);

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

  // ---------- modo MiSalud: pide los datos y los recibe (solo de la pagina que nos contiene) ----------
  useEffect(() => {
    if (!MODO_MISALUD) return undefined;
    const alMensaje = (e) => {
      if (e.source !== window.parent || e.origin !== origenWidget()) return;
      const d = e.data;
      if (!d || d.fuente !== "misalud" || d.tipo !== "paciente") return;
      const datos = leerDatosMiSalud(d.datos);
      misaludRef.current = datos;
      setMisalud(datos);
    };
    window.addEventListener("message", alMensaje);
    avisarMiSalud("listo");
    return () => window.removeEventListener("message", alMensaje);
  }, []);

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
    menu: (personaje === "ica" ? MENU_ICA : MENU).opciones,
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

  // texto: "inicio" | "otraVez" | "volver" (cada asistente tiene su version)

  // ---------- quien atiende: traspaso entre Ica e Ipo ----------
  const PAUSA_TRASPASO_MS = 350;

  // Cambia de asistente en la misma pantalla (dibujo, nombre y voz)
  const pasarA = async (sesion, p) => {
    cambiarPersonaje(p);
    setPregunta(null);
    setEntendido("");
    await new Promise((r) => setTimeout(r, PAUSA_TRASPASO_MS)); // se ve el cambio de asistente
    vigente(sesion);
  };

  // Menu de quien este atendiendo. cual: "inicio" | "otraVez" | "volver"
  const menu = (sesion, cual = "inicio") =>
    (personajeRef.current === "ica" ? f.menuIca(sesion, cual) : f.menuIpo(sesion, cual));

  // ---------- "¿Te ayudo en algo mas?" ----------
  const algoMas = async (sesion) => {
    setFase("conversacion");
    setProgreso(0);
    setResumen(true);
    // Si Ica se lo paso a Ipo, la que despide (o sigue ayudando) es Ica
    await f.devolverAIca(sesion, "fin");
    const { valor } = await preguntarCerrada(sesion, "sino", FRASES_COMUNES.algoMas, FRASES_COMUNES.repreguntaAlgoMas, true);
    if (valor) return menu(sesion, "otraVez");
    setPregunta(null);
    setFase("fin");
    await decir(sesion, FRASES_COMUNES.despedida);
    avisarMiSalud("terminado");
  };

  // Desde MiSalud: datos que no se vuelven a preguntar y a quien le toca
  const empezarDesdeMiSalud = async (sesion) => {
    const m = misaludRef.current || {};
    const ctx = ctxRef.current;
    if (m.edad) ctx.edad = m.edad;
    if (m.sexo) ctx.sexo = m.sexo;
    if (m.nombre && m.rut) datosRef.current = { nombre: m.nombre, rut: m.rut, email: m.email || "" };
    if (MOTIVO_MISALUD === "hora") {
      await f.recibirDeIpo(sesion, { primeraVez: true });
      return f.flujoHora(sesion);
    }
    if (MOTIVO_MISALUD === "generales" || MOTIVO_MISALUD === "preop") {
      elegirModulo(MOTIVO_MISALUD);
      return f.recibirExamenesDeIca(sesion, MOTIVO_MISALUD);
    }
    if (MOTIVO_MISALUD === "dolor") {
      elegirModulo("trauma");
      setFase("conversacion");
      if (m.zona) {
        ctx.zona = m.zona;
        if (m.lado) ctx.lado = m.lado;
        return f.recibirDolorDeIca(sesion, { quien: m.quien });
      }
      return f.conversar(sesion);
    }
    return menu(sesion);
  };

  // ---------- herramientas para los flujos de cada asistente ----------
  // api: lo que la pantalla les presta (hablar, preguntar, estados, referencias).
  // f: las funciones de todos (Ica, Ipo y la agenda) para que se llamen entre si.
  const api = {
    vigente, decir, hablar, callar, preguntarCerrada, preguntarAbierta, preguntarGrupo, esperarPuntos,
    elegirModulo, nuevoFlujo, pasarA, menu, algoMas, getInforme: () => informe,
    setFase, setPregunta, setEntendido, setProgreso, setResumen, setInforme, setError, setMarcadas,
    setOrdenUrl, setConCorreo, setAgenda, setReserva, setEsperando,
    sesionRef, ctxRef, registroRef, idPagoRef, avisosRef, examenesRef, ordenRef, datosRef, conCorreoRef,
    moduloRef, personajeRef, desdeIcaRef, agendaRef, actividadRef, esperaRef, prefillRef, pendienteRef,
    escuchaRef, vozOkRef,
  };
  const f = {};
  Object.assign(f, crearAgenda(api, f), crearFlujoIca(api, f), crearFlujoIpo(api, f));

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
    cambiarPersonaje(PERSONAJE_INICIAL);
    desdeIcaRef.current = false;
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
      setAvisoMic(`Este navegador no permite hablarle a ${PERSONAJES[PERSONAJE_INICIAL].nombre}. Abre la página en Chrome para usar la voz, o responde con los botones.`);
    }
    try {
      if (MODO_MISALUD) await empezarDesdeMiSalud(sesion);
      else await menu(sesion);
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
      await f.analizar(sesion, informe?.marcadores);
    } catch (e) {
      if (!(e instanceof Interrumpido)) setFase("error");
    }
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
    cambiarPersonaje(PERSONAJE_INICIAL); // la burbuja vuelve a mostrar a quien recibe
    desdeIcaRef.current = false;
    setAbierto(false);
    avisarWidget("cerrado");
  };

  const soportado = vozSoportada;
  const P = PERSONAJES[personaje];
  const AvatarActual = personaje === "ica" ? AvatarIca : AvatarIpo;
  const enCurso = fase !== "inicio";
  const avatarGrande = ["inicio", "conversacion", "urgencia", "fin", "analizando"].includes(fase) && !resumen;
  const verResumen = resumen && ["conversacion", "fin"].includes(fase);

  if (MODO_WIDGET && !abierto) {
    return (
      <div style={S.widgetCaja}>
        <button type="button" style={S.widgetBoton} onClick={abrirWidget} aria-label={`Abrir a ${P.nombre}, ${P.rol.toLowerCase()} de ICA`}>
          <span style={S.widgetCara}><AvatarActual estado="reposo" boca={0} /></span>
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
          <p style={S.sub}>{P.nombre} · {P.rol}</p>
        </div>
        {MODO_WIDGET && (
          <button type="button" style={S.cerrar} onClick={cerrarWidget} aria-label={`Cerrar a ${P.nombre}`}>✕</button>
        )}
        {MODO_MISALUD && (
          <button type="button" style={S.cerrar}
            onClick={() => { sesionRef.current += 1; callar(); escuchaRef.current?.pausar(); avisarMiSalud("cerrar"); }}
            aria-label="Volver a MiSalud">✕</button>
        )}
      </header>

      <main style={{ ...S.main, ...(fase === "agenda" ? S.mainAgenda : null) }}>
        {fase !== "agenda" && (
          <div key={personaje} className="avatar-cambio" style={{ ...S.avatar, ...(avatarGrande ? {} : S.avatarChico) }}>
            <AvatarActual estado={estadoAvatar} boca={boca} />
          </div>
        )}

        {avisoMic && enCurso && <p style={S.aviso}>{avisoMic}</p>}

        {enCurso && fase === "conversacion" && modulo !== "hora" && progreso > 0 && (
          <div style={S.barra}><div style={{ ...S.barraLlena, width: `${progreso}%` }} /></div>
        )}

        {/* ---------- INICIO ---------- */}
        {fase === "inicio" && (
          <section style={S.tarjetaCentro}>
            {personaje === "ica" ? (
              <>
                <h1 style={S.titulo}>Hola, soy Ica, de recepción</h1>
                <p style={S.texto}>
                  Te ayudo a tomar hora con un médico. Si tienes un dolor o necesitas exámenes, te paso con Ipo,
                  nuestro asistente, que te orienta y te entrega la orden.
                </p>
              </>
            ) : (
              <>
                <h1 style={S.titulo}>Hola, soy Ipo, tu asistente virtual</h1>
                <p style={S.texto}>
                  Cuéntame qué necesitas: orientarte por un dolor, o exámenes generales o para una cirugía.
                  Te respondo por voz y te entrego la orden; si necesitas hora con el especialista, Ica te la busca.
                </p>
              </>
            )}
            {MODO_MISALUD && misalud && (
              <p style={S.texto}><strong>{misalud.quien}</strong> te pasó conmigo desde MiSalud.</p>
            )}
            <p style={S.legal}>Al comenzar, el navegador te pedirá permiso para usar el micrófono: toca "Permitir".</p>
            {!soportado && (
              <p style={S.aviso}>Tu navegador no permite voz. Igual puedes responder tocando o escribiendo.</p>
            )}
            <button type="button" style={S.btnPrimario} onClick={comenzar}>Comenzar</button>
            {!MODO_WIDGET && !MODO_MISALUD && (
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
              <div style={S.avatarMini}><AvatarActual estado={estadoAvatar} boca={boca} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button type="button" style={S.btnSecundario} onClick={f.volverDeAgenda}>← Volver con {P.nombre}</button>
                {vozOkRef.current && esperando && <p style={{ ...S.escuchando, margin: "4px 0 0", fontSize: 12 }}>O dime "volver".</p>}
              </div>
              {ordenUrl && (
                <a href={ordenUrl} download={ORDEN.trauma.archivo} style={S.enlace}>Descargar orden</a>
              )}
            </div>
            <iframe ref={iframeRef} src={agenda.url} title="Agenda de horas" style={S.iframe} />
          </section>
        )}

        {fase === "datos" && <FormularioDatos onEnviar={f.enviarDatos} />}

        {fase === "resonancia" && (
          <section style={S.tarjeta}>
            <FormularioResonancia initial={{}} onSave={(form) => f.guardarResonancia(form)} onCancel={() => setFase("datos")} />
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
