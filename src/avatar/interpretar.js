/**
 * interpretar.js
 * Interpretacion de respuestas habladas por palabras clave (sin costo, en el navegador),
 * armado de la consulta que se envia al backend, lectura del informe y RUT.
 */
import { ZONAS, esColumna } from "./bancoPreguntas.js";

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
