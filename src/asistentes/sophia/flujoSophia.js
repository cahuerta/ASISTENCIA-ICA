/**
 * sophia/flujoSophia.js
 * Lo que hace Sophia, la investigadora: responde con la mejor evidencia
 * científica (EvidenciaMed, a través de Backend-avatar-medico). Solo informativo:
 * no hace diagnósticos nuevos ni emite órdenes.
 *
 * DOS ENTRADAS:
 *  - Desde Ipo (sophiaRecibeDeIpo): al final del flujo de dolor el paciente pide
 *    "más información". Ipo le pasa TODO el caso que tiene en la pantalla (zona,
 *    lado, edad, sexo, relato, respuestas, diagnóstico presuntivo, fundamento y
 *    examen; nunca nombre ni RUT). Sophia lo resume en una frase, busca la evidencia
 *    sobre el diagnóstico presuntivo y la explica unida a lo que contó el paciente.
 *  - Directa (menuSophia; app.icarticular.cl/?asistente=sophia): sin datos, solo
 *    para contestar preguntas.
 *
 * DESPUÉS DE CADA RESPUESTA (seguir), con botones a la vista y por voz:
 *  - otra pregunta (si la dice directo, se responde esa),
 *  - volver con Ipo (desde Ipo: vuelve a "¿orden, hora o más información?";
 *    directa: el menú de Ipo), o "tengo un dolor" (directa: consulta de dolor),
 *  - hora con Ica (si hay zona, la agenda del especialista recomendado o de la zona),
 *  - terminar.
 * Con caso, las preguntas siguientes también llevan el caso (mejor búsqueda).
 *
 * El traspaso es en la misma pantalla (api.pasarA): el caso no sale del navegador
 * salvo hacia Backend-avatar-medico, que lo usa para buscar y resumir.
 *
 * Variable de entorno (Vercel): VITE_AVATAR_BACKEND, URL de Backend-avatar-medico.
 *
 * crearFlujoSophia(api, f): api = herramientas de la pantalla; f = funciones de
 * todos (f.recibirDeSophia, f.dolorDesdeSophia, f.menuIpo, f.recibirDeIpo,
 * f.buscarEspecialista, f.abrirAgenda, f.flujoHora). Devuelve las de Sophia.
 */
import { MENU_SOPHIA, FRASES_SOPHIA, TRASPASO_SOPHIA, SALIDA_SOPHIA } from "./textosSophia.js";
import { normalizar, zonaEnVoz, esRespuestaVacia } from "../comun/interpretar.js";

// import.meta.env sin "?.": Vite solo reemplaza la forma exacta al compilar
export const AVATAR_BACKEND = (import.meta.env.VITE_AVATAR_BACKEND || "https://backend-avatar-medico.onrender.com")
  .replace(/\/$/, "");

// EvidenciaMed analiza varios estudios y los servidores pueden estar despertando
const TIMEOUT_CONSULTA_MS = 200000;
const ESPERA_ENTRE_DESPERTARES_MS = 300000;

// Topes del caso que se manda (el backend también recorta)
const MAX_RELATO = 3000;
const MAX_RESPUESTAS = 40;
const MAX_RESPUESTA = 400;

// ---------- backend ----------
let ultimoDespertar = 0;
// Despierta Backend-avatar-medico y EvidenciaMed (Render se duerme sin uso).
// Como mucho una vez cada 5 minutos.
export function despertarSophia() {
  if (typeof fetch === "undefined" || Date.now() - ultimoDespertar < ESPERA_ENTRE_DESPERTARES_MS) return;
  ultimoDespertar = Date.now();
  fetch(`${AVATAR_BACKEND}/ping`, { cache: "no-store" }).catch(() => {});
}

async function consultarEvidencia(consulta, caso) {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), TIMEOUT_CONSULTA_MS);
  try {
    const res = await fetch(`${AVATAR_BACKEND}/paciente/consultar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consulta: String(consulta || "").slice(0, 3000), caso: caso || undefined }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(reloj);
  }
}

// ---------- interpretar "¿y ahora qué?" ----------
const contiene = (t, patrones) => patrones.some((p) => new RegExp(`\\b${p}`).test(t));

// Frases que empiezan así son preguntas para Sophia, no órdenes
// ("¿qué examen sirve para...?" no es "volver con Ipo por la orden")
const INICIO_PREGUNTA = new Set([
  "que", "como", "cual", "cuales", "cuando", "cuanto", "cuanta", "cuantos", "cuantas", "donde", "por",
  "es", "son", "hay", "sirve", "sirven", "puedo", "debo", "existe", "existen", "conviene",
]);
const MAX_PALABRAS_ORDEN = 8;
const MIN_PALABRAS_PREGUNTA = 3;

/**
 * { accion: "pregunta" | "ipo" | "dolor" | "hora" | "fin", texto? } | null
 * desdeIpo: vino con su caso ("ipo" = volver con Ipo; "dolor" no aplica)
 */
export function interpretarSalida(texto, desdeIpo) {
  const t = normalizar(texto);
  if (!t) return null;
  const palabras = t.split(" ");
  // La voz no marca tildes ("que" o "qué"): si nombra a Ipo o Ica, es para ir con ellos
  const esPregunta = INICIO_PREGUNTA.has(palabras[0]) && !contiene(t, ["ipo\\b", "ica\\b"]);

  if (!esPregunta && palabras.length <= MAX_PALABRAS_ORDEN) {
    if (t === "no" || contiene(t, ["termin", "nada mas", "no gracias", "eso es todo", "eso seria", "chao", "adios", "hasta luego"])) {
      return { accion: "fin" };
    }
    if (contiene(t, ["hora\\b", "horas\\b", "agend", "reserv", "cita\\b", "ica\\b", "recepcion"])) return { accion: "hora" };
    if (contiene(t, ["ipo\\b", "volver", "vuelve", "volvamos", "regres", "orden"])) return { accion: "ipo" };
    if (!desdeIpo && contiene(t, ["dolor", "duele", "molest"])) return { accion: "dolor" };
    if (contiene(t, ["pregunta", "otra\\b", "duda", "consulta", "si\\b", "claro"])) return { accion: "pregunta" };
  }
  // Dijo directo su pregunta: se responde esa
  if (palabras.length >= MIN_PALABRAS_PREGUNTA) return { accion: "pregunta", texto: String(texto).trim() };
  return null;
}

// "Gonartrosis" -> "gonartrosis" (no las siglas)
const minuscula = (x) => (x && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x);
const sinPunto = (s) => String(s || "").trim().replace(/[.;:,]+$/, "");

export function crearFlujoSophia(api, f) {
  const {
    vigente, decir, mientras, pasarA, preguntarCerrada, preguntarAbierta, despedir,
    setFase, setPregunta, setEntendido, setProgreso, setResumen, setPensando, setEvidencia,
    ctxRef, registroRef, informeRef, desdeIpoRef, desdeIcaRef,
  } = api;

  // ---------- el caso que dejó Ipo en la pantalla (sin nombre ni RUT) ----------
  const armarCaso = () => {
    const ctx = ctxRef.current || {};
    const inf = informeRef.current || {};
    const registro = registroRef.current || [];
    const relato = registro.find((r) => r.id === "relato")?.respuesta || "";
    const respuestas = registro
      .filter((r) => r.id !== "relato" && r.resumen)
      .map((r) => {
        const resp = typeof r.valor === "boolean" ? (r.valor ? "sí" : "no") : String(r.respuesta || "").trim();
        return resp ? `${r.resumen}: ${resp}`.slice(0, MAX_RESPUESTA) : "";
      })
      .filter(Boolean)
      .slice(0, MAX_RESPUESTAS);
    return {
      zona: ctx.zona || null,
      lado: ctx.lado || null,
      edad: Number.isInteger(ctx.edad) ? ctx.edad : null,
      sexo: ctx.sexo || null,
      relato: String(relato).slice(0, MAX_RELATO) || null,
      respuestas,
      prediagnostico: inf.diagnosticos?.[0] || null,
      fundamento: inf.explicacion || null,
      examen: inf.examenes?.[0] || null,
    };
  };

  const casoSiVieneDeIpo = () => (desdeIpoRef.current ? armarCaso() : null);

  // ---------- buscar la evidencia y decirla ----------
  // avisar: dice que está revisando (desde Ipo ya lo dijo al presentarse)
  const responder = async (sesion, consulta, caso, { avisar = true } = {}) => {
    setPregunta(null);
    setEntendido("");
    setFase("conversacion");
    setResumen(false);
    setProgreso(0);
    if (avisar) await decir(sesion, FRASES_SOPHIA.buscando);
    setPensando(true);
    let r = null;
    try {
      r = await mientras(sesion, consultarEvidencia(consulta, caso));
    } catch {
      r = null; // sin red, servidor dormido o demoró demasiado
    } finally {
      setPensando(false);
    }
    vigente(sesion);
    // Lo que dice queda en pantalla (resumen) aunque despues pregunte que sigue;
    // la respuesta completa y los estudios, en un desplegable
    if (!r || !r.voz) {
      setEvidencia({ resumen: FRASES_SOPHIA.errorConexion, texto: "", papers: [] });
      await decir(sesion, FRASES_SOPHIA.errorConexion);
      return;
    }
    const conDetalle = r.tipo === "respondida" && Boolean(r.texto);
    setEvidencia({
      resumen: String(r.voz),
      texto: conDetalle ? String(r.texto) : "",
      papers: conDetalle && Array.isArray(r.papers) ? r.papers : [],
    });
    await decir(sesion, conDetalle ? `${r.voz} ${FRASES_SOPHIA.verDetalle}` : r.voz);
  };

  // ---------- desde Ipo, con todo el caso ----------
  const sophiaRecibeDeIpo = async (sesion) => {
    desdeIpoRef.current = true;
    const caso = armarCaso();
    await pasarA(sesion, "sophia");
    setFase("conversacion");
    setResumen(false);
    setEvidencia(null);
    const donde = caso.zona ? zonaEnVoz(caso.zona, caso.lado) : "";
    const dx = caso.prediagnostico ? minuscula(sinPunto(caso.prediagnostico)) : "";
    await decir(sesion, FRASES_SOPHIA.desdeIpo(donde, dx));
    await responder(sesion, "", caso, { avisar: false });
    return seguir(sesion);
  };

  // ---------- entrada directa: una pregunta abierta ----------
  // cual: "inicio" | "otraVez" | "volver"
  const menuSophia = async (sesion, cual = "inicio") => {
    setFase("conversacion");
    setProgreso(0);
    setResumen(false);
    despertarSophia();
    const pregunta = await preguntarAbierta(sesion, cual === "inicio" ? MENU_SOPHIA.texto : MENU_SOPHIA.otraVez);
    if (esRespuestaVacia(pregunta)) return seguir(sesion);
    await responder(sesion, pregunta, casoSiVieneDeIpo());
    return seguir(sesion);
  };

  // ---------- después de cada respuesta ----------
  const seguir = async (sesion) => {
    for (;;) {
      const desdeIpo = desdeIpoRef.current;
      const s = desdeIpo ? SALIDA_SOPHIA.desdeIpo : SALIDA_SOPHIA.directo;
      const { valor } = await preguntarCerrada(
        sesion, "salida", s.texto, s.repregunta, true, (t) => interpretarSalida(t, desdeIpo), s.opciones,
      );
      setPregunta(null);

      if (valor.accion === "pregunta") {
        const pregunta = valor.texto || (await preguntarAbierta(sesion, FRASES_SOPHIA.otraPregunta));
        if (esRespuestaVacia(pregunta)) continue;
        await responder(sesion, pregunta, casoSiVieneDeIpo());
        continue;
      }
      setEntendido("");
      if (valor.accion === "fin") return despedir(sesion);
      if (valor.accion === "hora") return horaConIca(sesion);
      if (valor.accion === "dolor") {
        await decir(sesion, TRASPASO_SOPHIA.aIpoDolor);
        return f.dolorDesdeSophia(sesion);
      }
      // "ipo": desde Ipo vuelve a su pregunta final; directa, al menú de Ipo
      if (desdeIpo) {
        await decir(sesion, TRASPASO_SOPHIA.aIpo);
        return f.recibirDeSophia(sesion);
      }
      await decir(sesion, TRASPASO_SOPHIA.aIpoMenu);
      await pasarA(sesion, "ipo");
      return f.menuIpo(sesion);
    }
  };

  // ---------- hora con Ica ----------
  // Ica la recibe (f.recibirDeIpo: se presenta o saluda de nuevo) y, si hay zona,
  // abre la agenda del especialista recomendado (o de la zona); si no, pregunta con quién
  const horaConIca = async (sesion) => {
    await decir(sesion, TRASPASO_SOPHIA.aIca);
    const primeraVez = !desdeIcaRef.current;
    desdeIcaRef.current = true;
    await f.recibirDeIpo(sesion, { primeraVez });
    const zona = ctxRef.current.zona;
    if (!zona || zona === "Espalda") return f.flujoHora(sesion);
    const { medico } = await f.buscarEspecialista(sesion, zona);
    return f.abrirAgenda(sesion, medico ? { medico } : { zona });
  };

  return { menuSophia, sophiaRecibeDeIpo };
}
