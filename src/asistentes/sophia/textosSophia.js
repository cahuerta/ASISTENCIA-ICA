/**
 * sophia/textosSophia.js
 * Lo que dice Sophia, la investigadora: su saludo (entrando directo), lo que dice
 * al recibir el caso de Ipo, mientras revisa los estudios, la pregunta para seguir
 * (otra pregunta / volver con Ipo / hora con Ica / terminar) y los traspasos.
 *
 * En pantalla se escribe "Sophia"; la voz dice "Sofía" (comun/useVoz.js, PRONUNCIAR).
 */

export const PERSONAJE_SOPHIA = { nombre: "Sophia", rol: "Investigadora", voz: "sophia" };

// Entrando directo (app.icarticular.cl/?asistente=sophia): pregunta abierta
export const MENU_SOPHIA = {
  texto:
    "Hola, soy Sophia, investigadora del Instituto de Cirugía Articular. Pregúntame lo que quieras saber " +
    "sobre una lesión, una enfermedad o un tratamiento, y te respondo con la mejor evidencia científica.",
  otraVez: "Cuéntame, ¿qué más quieres saber?",
};

export const FRASES_SOPHIA = {
  // Recibe el caso de Ipo. donde: "la rodilla derecha"; dx: "gonartrosis" (ya en minúscula)
  desdeIpo: (donde, dx) =>
    `Hola, soy Sophia. Ipo me contó tu caso${donde ? `: dolor en ${donde}` : ""}` +
    `${dx ? `, con un diagnóstico presuntivo de ${dx}` : ""}. ` +
    "Voy a revisar qué dicen los estudios científicos para explicártelo mejor. Puede tomar un minuto.",
  buscando: "Estoy revisando los estudios científicos. Puede tomar un minuto.",
  otraPregunta: "Cuéntame, ¿qué quieres saber?",
  errorConexion: "Tuve un problema para revisar los estudios en este momento. Intenta de nuevo en un rato.",
  verDetalle: "Abajo puedes leer la respuesta completa y los estudios que revisé.",
};

// Traspasos a Ipo o a Ica
export const TRASPASO_SOPHIA = {
  aIpo: "Te devuelvo con Ipo.",
  aIca: "Te paso con Ica, de recepción, que te busca la hora.",
  aIpoDolor: "Te paso con Ipo, nuestro asistente, que te hará unas preguntas sobre tu dolor.",
  // Entró directo a Sophia y pide a Ipo (o exámenes): Ipo lo atiende con su menú
  aIpoMenu: "Te paso con Ipo, nuestro asistente.",
};

// Para seguir: botones a la vista y por voz. desdeIpo: vino con su caso.
// valor = { accion } ; si dice directo otra pregunta, va con { accion: "pregunta", texto }
export const SALIDA_SOPHIA = {
  desdeIpo: {
    texto: "¿Tienes otra pregunta, quieres volver con Ipo para tu orden de exámenes, o que Ica te busque hora con el especialista?",
    repregunta: "¿Otra pregunta, volver con Ipo, hora con Ica, o terminamos?",
    opciones: [
      { etiqueta: "Otra pregunta", valor: { accion: "pregunta" } },
      { etiqueta: "Volver con Ipo (orden)", valor: { accion: "ipo" } },
      { etiqueta: "Hora con Ica", valor: { accion: "hora" } },
      { etiqueta: "Terminar", valor: { accion: "fin" } },
    ],
  },
  directo: {
    texto: "¿Tienes otra pregunta? También puedo pasarte con Ica para tomar hora, o con Ipo si tienes un dolor.",
    repregunta: "¿Otra pregunta, hora con Ica, pasar con Ipo por un dolor, o terminamos?",
    opciones: [
      { etiqueta: "Otra pregunta", valor: { accion: "pregunta" } },
      { etiqueta: "Hora con Ica", valor: { accion: "hora" } },
      { etiqueta: "Tengo un dolor (Ipo)", valor: { accion: "dolor" } },
      { etiqueta: "Terminar", valor: { accion: "fin" } },
    ],
  },
};

// Lo que se muestra como "entendido" al elegir
const ETIQUETA_ACCION = {
  pregunta: "Otra pregunta", ipo: "Volver con Ipo", hora: "Hora con Ica", dolor: "Tengo un dolor", fin: "Terminar",
};
export const etiquetaSalida = (v) => (v?.texto ? v.texto : ETIQUETA_ACCION[v?.accion] || "");
