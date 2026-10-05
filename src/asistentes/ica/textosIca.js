/**
 * ica/textosIca.js
 * Lo que dice Ica, la recepcionista de la pagina principal: su saludo y menu, y
 * lo que dice al pasarle el paciente a Ipo o al recibirlo de vuelta.
 */

export const PERSONAJE_ICA = { nombre: "Ica", rol: "Recepción", voz: "femenina" };

// Menu de Ica: mismas opciones que el de Ipo; el dolor y los examenes los atiende Ipo
export const MENU_ICA = {
  texto:
    "Hola, soy Ica, de recepción del Instituto de Cirugía Articular. ¿En qué te ayudo? Puedo buscarte hora con un médico. " +
    "Y si tienes un dolor o necesitas exámenes, te paso con Ipo, nuestro asistente.",
  otraVez: "¿En qué más te ayudo? Puedo buscarte hora con un médico, o pasarte con Ipo si tienes un dolor o necesitas exámenes.",
  volver: "Aquí estoy. ¿En qué te ayudo? Puedo buscarte hora con un médico, o pasarte con Ipo si tienes un dolor o necesitas exámenes.",
  repregunta: "Perdón, no te entendí. ¿Quieres hora con un médico, tienes un dolor, o necesitas exámenes?",
  opciones: [
    { etiqueta: "Hora con un médico", valor: "hora" },
    { etiqueta: "Tengo un dolor", valor: "dolor" },
    { etiqueta: "Exámenes generales", valor: "generales" },
    { etiqueta: "Exámenes para una cirugía", valor: "preop" },
  ],
};

// Traspasos con Ipo
export const TRASPASO_ICA = {
  // Ica pregunta solo la zona y el lado antes de pasarlo a Ipo
  zona: "Cuéntame, ¿en qué parte del cuerpo tienes el dolor?",
  aDolor: "Gracias. Te paso con Ipo, nuestro asistente, que te hará unas preguntas sobre tu dolor.",
  aExamenes: (tipo) =>
    `Te paso con Ipo, nuestro asistente, que te ayuda con tus exámenes ${tipo === "preop" ? "para la cirugía" : "generales"}.`,
  vuelve: "Hola de nuevo.",
};
