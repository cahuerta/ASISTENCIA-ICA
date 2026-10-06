/**
 * ipo/textosIpo.js
 * Lo que dice Ipo, el asistente de dolor y examenes: su menu (cuando se entra
 * directo a la app), el inicio de la consulta, la pregunta final (orden / hora),
 * las frases de cada paso y lo que dice al recibir o devolver al paciente a Ica.
 * Las preguntas de la consulta estan en bancoPreguntas.js.
 */

export const PERSONAJE_IPO = { nombre: "Ipo", rol: "Asistente virtual", voz: "masculina" };

// ---------------- Menu inicial ----------------
// Ipo atiende dolor y examenes. La hora con un medico la busca Ica, al final,
// cuando ya hay diagnostico y especialista (o si el paciente la pide).
export const MENU = {
  texto:
    "Hola, soy Ipo, el asistente virtual del Instituto de Cirugía Articular. ¿En qué te ayudo? Puedo ayudarte si tienes un dolor, " +
    "o prepararte exámenes generales o para una cirugía.",
  // Cuando vuelve al menu despues de terminar algo
  otraVez: "¿En qué te ayudo? Puedo ayudarte si tienes un dolor, o prepararte exámenes generales o para una cirugía.",
  // Cuando vuelve desde la agenda sin reservar
  volver: "Aquí estoy. ¿En qué te ayudo? Puedo ayudarte si tienes un dolor, o prepararte exámenes generales o para una cirugía.",
  repregunta: "Perdón, no te entendí. ¿Tienes un dolor, o necesitas exámenes generales o para una cirugía?",
  opciones: [
    { etiqueta: "Tengo un dolor", valor: "dolor" },
    { etiqueta: "Exámenes generales", valor: "generales" },
    { etiqueta: "Exámenes para una cirugía", valor: "preop" },
  ],
};

// Al final del flujo de dolor
export const ACCION_FINAL = {
  texto: "¿Te hago la orden de exámenes, o te busco hora con el especialista más adecuado?",
  repregunta: "¿Quieres la orden de exámenes, una hora con el especialista, o ambas?",
  opciones: [
    { etiqueta: "Orden de exámenes", valor: "orden" },
    { etiqueta: "Hora con especialista", valor: "hora" },
    { etiqueta: "Ambas", valor: "ambas" },
    { etiqueta: "No, gracias", valor: "ninguna" },
  ],
};

// Inicio del flujo de dolor (antes era el saludo)
export const SALUDO =
  "Muy bien. Te voy a hacer algunas preguntas, como en una consulta, para orientarte y, si lo necesitas, " +
  "entregarte una orden de exámenes. Responde hablando con naturalidad.";

// Traspasos con Ica (zona ya viene en voz: "la rodilla derecha")
export const TRASPASO_IPO = {
  // quien: "Ica", o el asistente de MiSalud que se lo paso (por defecto Katia)
  confirma: (zona, quien = "Ica") => `Hola, soy Ipo. ${quien} me contó que te duele ${zona}, ¿es así?`,
  repreguntaConfirma: (zona) => `Responde sí o no, por favor: ¿te duele ${zona}?`,
  corrige: "Perdón, entonces empecemos desde el principio.",
  examenes: "Hola, soy Ipo. Yo te ayudo con tus exámenes.",
  aIcaHora: "Te devuelvo con Ica, que te busca la hora.",
  // Entrando directo a la app (todavia no habia hablado con Ica)
  aIcaHoraPrimera: "Te paso con Ica, de recepción, que te busca la hora.",
  // Recomendacion antes de pasarlo a Ica para la hora
  // medico y zona ya vienen en voz ("el doctor Jaime Espinoza", "el hombro derecho")
  recomendarHora: (medico, zona) =>
    `Para el dolor de ${zona}, te recomiendo a ${medico}.`.replace(" a el ", " al ").replace(" de el ", " del "),
  aIcaFin: "Te dejo con Ica.",
};

export const FRASES = {
  // ---- generales y preoperatorio ----
  inicioGenerales:
    "Perfecto. Para proponerte exámenes generales te haré unas preguntas sobre tu salud. Puedes responder hablando o tocando los botones.",
  inicioPreop:
    "Perfecto. Para tus exámenes antes de la cirugía te haré unas preguntas. Puedes responder hablando o tocando los botones.",
  cirugia: "¿Qué cirugía te van a hacer?",
  repreguntaCirugia: "¿Me repites qué cirugía? Por ejemplo, prótesis de cadera o artroscopia de rodilla. También puedes tocarla abajo.",
  cirugiaOtra: "¿Cómo se llama la cirugía?",
  ladoCirugia: "¿Es del lado derecho o del izquierdo?",
  enfermedades: "Ahora te preguntaré por algunas enfermedades.",
  analizandoExamenes: "Gracias. Estoy preparando tu propuesta de exámenes, dame un momento.",
  errorExamenes: "Tuve un problema para preparar tus exámenes. Intenta de nuevo en un momento.",
  ayudaDolor: "Te ayudo. Te haré unas preguntas sobre tu dolor, para buscarte el especialista más adecuado.",
  // si eligio solo la orden: especialista recomendado (el mismo que sale en la orden)
  recomendar: (medico, zona) =>
    `Te recomiendo que te evalúe ${medico}${zona ? `, especialista en ${zona}` : ""}. ¿Quieres que te busque hora?`,
  recomendarSinMedico: "¿Quieres que te busque hora con un especialista?",
  repreguntaRecomendar: "Responde sí o no, por favor: ¿quieres que te busque hora?",
  // espalda: cervical, dorsal o lumbar en el dibujo
  nivelColumna: "Muéstrame en el dibujo dónde te duele la espalda: en el cuello, en la parte media, o en la parte baja.",
  repreguntaNivelColumna: "¿Es en el cuello, en la parte media de la espalda, o en la parte baja? También puedes tocarlo en el dibujo.",

  puntos: "Ahora muéstrame en el dibujo dónde te duele. Marca los puntos y luego toca guardar.",
  analizando: "Gracias. Estoy revisando todo lo que me contaste, dame un momento.",
  urgencia:
    "Por lo que me cuentas, es importante que te evalúe un médico pronto. Te recomiendo acudir a un servicio de urgencia. " +
    "No es conveniente esperar una orden de exámenes en este caso.",
  preguntarOrden: "¿Quieres que te entregue la orden de exámenes?",
  repreguntarOrden: "Responde sí o no, por favor: ¿quieres la orden de exámenes?",
  sinOrden: "Está bien, sin problema.",
  pedirDatos: "Perfecto. Para emitir la orden, completa tus datos en la pantalla.",
  // Ya tiene sus datos (viene de MiSalud): la orden sale sin formulario
  ordenConTusDatos: "Perfecto. Preparo la orden con tus datos.",
  resonancia: "Como incluye una resonancia, antes de emitir la orden responde unas preguntas de seguridad en la pantalla.",
  ordenLista: "Listo. Tu orden de exámenes está lista para descargar.",
  ordenListaCorreo: "Listo. Tu orden está lista para descargar, y también te la enviamos por correo.",
  cierre: "Recuerda que esto es una orientación y no reemplaza la evaluación presencial con un especialista.",
  errorAnalisis: "Tuve un problema para revisar tu información. Intenta de nuevo en un momento.",
};
