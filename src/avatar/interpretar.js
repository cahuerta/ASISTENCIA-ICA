/**
 * interpretar.js
 * Interpretacion de respuestas habladas por palabras clave (sin costo, en el navegador),
 * armado de la consulta que se envia al backend, lectura del informe y RUT.
 */
import { ZONAS, esColumna, CIRUGIAS } from "./bancoPreguntas.js";

export function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const contiene = (t, patrones) => patrones.some((p) => new RegExp(`\\b${p}`).test(t));

// ---------------- zona ----------------
const CLAVES_ZONA = [
  ["Columna lumbar", ["lumbar", "espalda baja", "parte baja de la espalda", "cintura", "lumbago", "ciatica"]],
  ["Columna cervical", ["cuello", "cervical", "nuca"]],
  ["Columna dorsal", ["dorsal", "espalda alta", "parte alta de la espalda", "entre los omoplatos", "entre las paletas"]],
  ["Rodilla", ["rodilla"]],
  ["Cadera", ["cadera", "ingle"]],
  ["Hombro", ["hombro"]],
  ["Codo", ["codo"]],
  ["Mano", ["mano\\b", "manos\\b", "muneca", "dedo", "pulgar"]],
  ["Tobillo", ["tobillo", "pie\\b", "pies\\b", "talon", "planta del pie"]],
];

export function interpretarZona(texto) {
  const t = normalizar(texto);
  for (const [zona, claves] of CLAVES_ZONA) {
    if (contiene(t, claves)) return zona;
  }
  return null; // "espalda" sola es ambigua: se repregunta
}

// ---------------- lado ----------------
export function interpretarLado(texto) {
  const t = normalizar(texto);
  const der = /\bderech/.test(t);
  const izq = /\bizquier/.test(t);
  if (der && !izq) return "Derecha";
  if (izq && !der) return "Izquierda";
  return null; // ninguno o ambos: se repregunta cual duele mas
}

// ---------------- edad ----------------
const UNIDADES = {
  uno: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29,
};
const DECENAS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100 };

export function interpretarEdad(texto) {
  const t = normalizar(texto);
  const digitos = t.match(/\b(\d{1,3})\b/);
  if (digitos) {
    const n = Number(digitos[1]);
    return n > 0 && n <= 110 ? n : null;
  }
  let total = 0;
  t.split(" ").forEach((p) => {
    if (DECENAS[p]) total += DECENAS[p];
    else if (UNIDADES[p]) total += UNIDADES[p];
  });
  return total > 0 && total <= 110 ? total : null;
}

// ---------------- sexo ----------------
export function interpretarSexo(texto) {
  const t = normalizar(texto);
  const h = contiene(t, ["hombre", "masculino", "varon", "caballero"]);
  const m = contiene(t, ["mujer", "femenino", "dama", "senora", "senorita"]);
  if (h && !m) return "Masculino";
  if (m && !h) return "Femenino";
  return null;
}

// ---------------- si / no ----------------
const PALABRAS_SI = ["si", "claro", "obvio", "correcto", "afirmativo", "exacto", "efectivamente", "tengo", "he tenido", "tuve", "me paso", "bueno ya", "ya po"];
const PALABRAS_NO = ["no", "nunca", "nada", "ninguno", "ninguna", "negativo", "tampoco", "para nada"];

export function interpretarSiNo(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  const primera = t.split(" ")[0];
  if (primera === "si") return true;
  if (primera === "no") return false;
  const si = contiene(t, PALABRAS_SI.map((p) => `${p}\\b`));
  const no = contiene(t, PALABRAS_NO.map((p) => `${p}\\b`));
  if (si && !no) return true;
  if (no && !si) return false;
  return null; // ambigua: se repregunta
}

export function esRespuestaVacia(texto) {
  const t = normalizar(texto);
  return !t || interpretarSiNo(t) === false || /^(nada mas|eso es todo|eso seria|nada)$/.test(t);
}

// ---------------- menu inicial ----------------
// En orden: gana la primera que calce. "hora" va primero con palabras
// inequivocas y al final con las que tambien aparecen en otras opciones
// ("el medico me pidio examenes para la cirugia" -> preop).
const CLAVES_MENU = [
  ["hora", ["hora\\b", "horas\\b", "agendar", "agenda", "reserv", "cita"]],
  ["preop", ["cirugia", "operar", "operacion", "opero", "operan", "preoperatori", "pre operatori", "pabellon", "protesis"]],
  ["generales", ["generales", "general", "chequeo", "rutina", "control", "sangre", "laboratorio"]],
  ["dolor", ["dolor", "duele", "molest", "sintoma", "lesion", "golpe", "torci", "cai"]],
  ["examenes", ["examen", "examenes", "orden"]],
  ["hora", ["traumatolog", "especialista", "doctor", "doctora", "medico", "medica", "atender", "consulta"]],
];

/** "hora" | "dolor" | "generales" | "preop" | "examenes" (sin decir cuales) | null */
export function interpretarMenu(texto) {
  const t = normalizar(texto);
  for (const [opcion, claves] of CLAVES_MENU) {
    if (contiene(t, claves)) return opcion;
  }
  return null;
}

/** Tipo de examenes cuando dijo solo "examenes": "generales" | "preop" | null */
export function interpretarTipoExamen(texto) {
  const t = normalizar(texto);
  const preop = contiene(t, CLAVES_MENU[1][1]);
  const gen = contiene(t, CLAVES_MENU[2][1]);
  if (preop && !gen) return "preop";
  if (gen && !preop) return "generales";
  return null;
}

// ---------------- hora con un medico ----------------
// Palabras que no sirven para reconocer un nombre
const NO_NOMBRE = new Set([
  "dr", "dra", "doc", "doctor", "doctora", "medico", "medica", "con", "del", "los", "las", "una", "uno",
  "quiero", "hora", "por", "favor", "que", "traumatologo", "traumatologa", "kinesiologo", "kinesiologa",
  "para", "esta", "este", "atiende", "llama", "nombre", "apellido", "senor", "senora",
]);

const palabrasNombre = (t) => t.split(" ").filter((p) => p.length >= 3 && !NO_NOMBRE.has(p));

const NO_SABE = ["no se\\b", "no lo se", "no sabria", "no conozco", "no tengo", "no recuerdo", "no me acuerdo",
  "ninguno", "cualquiera", "no importa", "no estoy seguro", "no estoy segura", "ayudame", "ayuda"];

/**
 * Reconoce al medico por su nombre (lista de /professionals de la ficha: { id, name }).
 * Devuelve { medico } | { varios: [medicos] } | { nosabe: true, zona } | null.
 * Si nombra una parte del cuerpo ("me duele la rodilla") cuenta como "no se",
 * con la zona para no volver a preguntarla.
 */
export function interpretarMedico(texto, medicos = []) {
  const t = normalizar(texto);
  if (!t) return null;
  const dichas = palabrasNombre(t);
  let mejor = 0;
  let candidatos = [];
  for (const m of medicos) {
    const partes = palabrasNombre(normalizar(m.name));
    const puntos = partes.filter((w) => dichas.some((p) =>
      p === w || (p.length >= 4 && w.length >= 4 && (w.startsWith(p) || p.startsWith(w))))).length;
    if (puntos > mejor) { mejor = puntos; candidatos = [m]; }
    else if (puntos && puntos === mejor) candidatos.push(m);
  }
  if (candidatos.length === 1) return { medico: candidatos[0] };
  if (candidatos.length > 1) return { varios: candidatos };
  const zona = interpretarZona(t);
  if (t === "no" || contiene(t, NO_SABE) || zona) return { nosabe: true, zona };
  return null;
}

/**
 * Nombre del profesional para decirlo en voz: "Dr. Jaime Espinoza" -> "el doctor Jaime Espinoza"
 * (sin abreviaturas, que la voz corta como si fueran fin de frase).
 */
export function nombreEnVoz(nombre) {
  const n = String(nombre || "").trim();
  const TITULOS = [
    [/^dra\.?\s+/i, "la doctora "], [/^dr\.?\s+/i, "el doctor "],
    [/^klga\.?\s+/i, "la kinesióloga "], [/^klgo\.?\s+/i, "el kinesiólogo "],
  ];
  for (const [re, titulo] of TITULOS) if (re.test(n)) return n.replace(re, titulo);
  return n;
}

// ---------------- pregunta final del flujo de dolor ----------------
/** "orden" | "hora" | "ambas" | "ninguna" | null */
export function interpretarAccionFinal(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  if (contiene(t, ["ambas", "ambos", "las dos", "los dos", "las 2", "los 2", "todo\\b", "las cosas"])) return "ambas";
  const noOrden = /\bno\s+(quiero\s+|necesito\s+)?(la\s+|una\s+|el\s+)?(orden|examen)/.test(t);
  const noHora = /\bno\s+(quiero\s+|necesito\s+)?(la\s+|una\s+)?(hora|cita)/.test(t);
  const orden = !noOrden && contiene(t, ["orden", "examen"]);
  const hora = !noHora && contiene(t, ["hora\\b", "especialista", "agend", "reserv", "cita", "medico", "doctor", "consulta"]);
  if (orden && hora) return "ambas";
  if (orden) return "orden";
  if (hora) return "hora";
  if ((noOrden && noHora) || contiene(t, ["ninguna", "ninguno", "nada", "no gracias"]) || t === "no") return "ninguna";
  return null;
}

// ---------------- mientras la agenda esta abierta ----------------
/** "volver" (vuelve con la asistente) | "seguir" (sigue en la agenda) | null (se ignora) */
export function interpretarVolver(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  if (contiene(t, ["volver", "vuelve", "volvamos", "regres", "cancel", "salir", "atras", "asistente"])) return "volver";
  if (contiene(t, ["decidi", "sigo", "seguir", "todavia", "aun\\b", "espera", "un momento", "eligiendo", "viendo", "si\\b"])) return "seguir";
  return null;
}

// ---------------- enfermedades previas ----------------
const CLAVES_COMORBILIDAD = {
  hta: ["presion", "hipertens", "tension alta"],
  dm2: ["diabet", "azucar", "insulina"],
  dislipidemia: ["colesterol", "triglicerid", "dislipid", "grasa en la sangre"],
  obesidad: ["sobrepeso", "obes", "peso"],
  tabaquismo: ["fum", "tabaco", "cigarr"],
  epoc_asma: ["asma", "epoc", "enfisema", "bronqu", "pulmon"],
  cardiopatia: ["corazon", "cardi", "infarto", "arritmi", "marcapaso"],
  erc: ["rinon", "renal", "dialisis"],
  hipotiroidismo: ["tiroid", "hipotiroid", "eutirox", "levotiroxin"],
  anticoagulantes: ["anticoagul", "aspirina", "sintrom", "neosintrom", "clopidogrel", "warfarin", "rivaroxaban", "apixaban", "xarelto"],
  artritis_reumatoide: ["artritis", "reumat", "lupus", "autoinmun"],
};

/**
 * Enfermedades de un grupo mencionadas en la respuesta. items = [{key}].
 * "todas" / "todos" marca el grupo completo. Devuelve [] si no reconoce ninguna.
 */
export function interpretarItems(items, texto) {
  const t = normalizar(texto);
  if (contiene(t, ["todas", "todos", "las tres", "los tres", "ambas", "ambos", "las dos", "los dos"])) {
    return items.map((i) => i.key);
  }
  return items.filter((i) => contiene(t, CLAVES_COMORBILIDAD[i.key] || [])).map((i) => i.key);
}

// ---------------- cirugia (preoperatorio) ----------------
/** Devuelve la cirugia de CIRUGIAS que corresponde, o null. */
export function interpretarCirugia(texto) {
  const t = normalizar(texto);
  const cadera = /\bcadera/.test(t);
  const rodilla = /\brodilla/.test(t);
  const zona = cadera && !rodilla ? "Cadera" : rodilla && !cadera ? "Rodilla" : null;
  const buscar = (valor) => CIRUGIAS.find((c) => c.valor === valor) || null;

  if (contiene(t, ["partes blandas", "cirugia menor", "menor"])) return buscar("CIRUGÍA MENOR DE PARTES BLANDAS");
  if (!zona) return null;
  if (contiene(t, ["protesis", "reemplazo", "artroplastia", "cambio de"])) {
    return buscar(zona === "Cadera" ? "ARTROPLASTIA TOTAL DE CADERA (ATC)" : "ARTROPLASTIA TOTAL DE RODILLA (ATR)");
  }
  if (contiene(t, ["artroscop", "camara", "menisco", "ligamento"])) {
    return buscar(zona === "Cadera" ? "ARTROSCOPIA DE CADERA" : "ARTROSCOPIA DE RODILLA");
  }
  if (contiene(t, ["osteotom"])) {
    return buscar(zona === "Cadera" ? "OSTEOTOMÍA DE CADERA" : "OSTEOTOMÍA DE RODILLA");
  }
  return null;
}

/** Texto hablado con los examenes propuestos (generales o preoperatorio). */
export function vozExamenes(examenes) {
  if (!examenes.length) return "No encontré exámenes adicionales que proponerte.";
  return examenes.length === 1
    ? `Te propongo el siguiente examen: ${listarEnVoz(examenes.map(minusculaExamen))}.`
    : `Te propongo ${examenes.length} exámenes: ${listarEnVoz(examenes.map(minusculaExamen))}.`;
}

const PALABRAS_CORTAS = new Set(["DE", "DEL", "Y", "LA", "EL", "LOS", "LAS", "EN", "CON", "SIN", "POR"]);

// "HEMOGRAMA" -> "hemograma" para que la voz no lo deletree; siglas cortas se mantienen
function minusculaExamen(e) {
  return String(e)
    .split(" ")
    .map((p) => (p.length <= 4 && p === p.toUpperCase() && !PALABRAS_CORTAS.has(p) ? p : p.toLowerCase()))
    .join(" ");
}

// ---------------- consulta para el backend ----------------
/**
 * Arma el texto que va en "consulta" de /api/preview-informe: datos, banderas rojas
 * y la conversacion textual (pregunta + respuesta), como una anamnesis.
 */
export function construirConsulta(ctx, registro) {
  const lineas = [];
  lineas.push("Anamnesis guiada por la asistente de voz (respuestas del paciente).");
  const zonaTxt = ctx.lado ? `${ctx.zona} ${ctx.lado.toLowerCase()}` : ctx.zona;
  lineas.push(`Motivo: dolor de ${String(zonaTxt || "").toLowerCase()}. Edad ${ctx.edad}, sexo ${String(ctx.sexo || "").toLowerCase()}.`);

  const banderas = registro.filter((r) => r.bandera);
  if (banderas.length) {
    const positivas = banderas.filter((r) => r.valor === true).map((r) => r.resumen);
    const negativas = banderas.filter((r) => r.valor === false).map((r) => r.resumen);
    if (positivas.length) lineas.push(`Signos de alarma presentes: ${positivas.join("; ")}.`);
    if (negativas.length) lineas.push(`Niega: ${negativas.join("; ")}.`);
  }

  registro
    .filter((r) => r.tipo === "abierta" && r.respuesta)
    .forEach((r) => lineas.push(`${r.resumen}: ${r.respuesta}`));

  return lineas.join("\n");
}

// ---------------- informe del backend ----------------
function seccion(texto, titulo, siguientes) {
  const fin = siguientes.join("|"); // los titulos ya vienen como expresiones regulares
  const re = new RegExp(`${titulo}\\s*:?\\s*([\\s\\S]*?)(?:\\n\\s*(?:${fin})\\s*:|$)`, "i");
  const m = texto.match(re);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.replace(/^[\s•\-*·]+/, "").trim())
    .filter(Boolean);
}

/** Lee el formato fijo de preview-informe: diagnostico presuntivo, explicacion, examenes. */
export function leerInforme(respuesta, examenesBackend) {
  const texto = String(respuesta || "");
  const diagnosticos = seccion(texto, "Diagn[oó]stico presuntivo", ["Explicaci[oó]n breve", "Ex[aá]menes sugeridos", "Indicaciones"]);
  const explicacion = seccion(texto, "Explicaci[oó]n breve", ["Ex[aá]menes sugeridos", "Indicaciones"]).join(" ");
  let examenes = Array.isArray(examenesBackend) && examenesBackend.length
    ? examenesBackend
    : seccion(texto, "Ex[aá]menes sugeridos", ["Indicaciones"]);
  examenes = examenes.map((e) => String(e).trim()).filter(Boolean);
  return { diagnosticos, explicacion, examenes };
}

const sinPunto = (s) => String(s || "").trim().replace(/[.;:,]+$/, "");

export function listarEnVoz(items) {
  const limpios = items.map(sinPunto).filter(Boolean);
  if (limpios.length <= 1) return limpios[0] || "";
  return `${limpios.slice(0, -1).join(", ")} y ${limpios[limpios.length - 1]}`;
}

/** Texto hablado del resultado, armado sin llamar a la IA. */
export function vozResultado({ diagnosticos, explicacion, examenes }) {
  const partes = [];
  if (diagnosticos.length) {
    const minuscula = (x) => (x && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x);
    let dx = minuscula(sinPunto(diagnosticos[0]));
    if (diagnosticos[1]) dx += `, o también podría tratarse de ${minuscula(sinPunto(diagnosticos[1]))}`;
    partes.push(`Con lo que me contaste, el diagnóstico presuntivo es ${dx}.`);
  }
  if (explicacion) partes.push(explicacion);
  if (examenes.length) {
    partes.push(examenes.length === 1
      ? `Para confirmarlo te propongo el siguiente examen: ${listarEnVoz(examenes)}.`
      : `Para confirmarlo te propongo estos exámenes: ${listarEnVoz(examenes)}.`);
  }
  return partes.join(" ");
}

export function incluyeResonancia(examenes) {
  const t = (examenes || []).join("\n");
  return /resonancia/i.test(t) || /\brm\b/i.test(t);
}

// ---------------- RUT (misma logica que el formulario de ICA) ----------------
export function limpiarRut(str = "") {
  return String(str).replace(/[^0-9kK]/g, "").toUpperCase();
}

function calcularDV(cuerpo = "") {
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function formatearRut(valor = "") {
  const s = limpiarRut(valor);
  if (s.length < 2) return s;
  const cuerpo = s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${s.slice(-1)}`;
}

export function validarRut(valor = "") {
  const s = limpiarRut(valor);
  if (s.length < 2) return "RUT incompleto";
  const cuerpo = s.slice(0, -1);
  if (!/^\d{1,8}$/.test(cuerpo)) return "RUT inválido";
  const dv = calcularDV(cuerpo);
  return s.slice(-1) === dv ? "" : `Dígito verificador incorrecto, debería ser ${dv}`;
}

export { ZONAS, esColumna };
