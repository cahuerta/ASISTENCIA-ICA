/**
 * bancoPreguntas.js
 * Banco de preguntas de la anamnesis guiada por la asistente de voz.
 * Editable: cambiar textos, agregar o quitar preguntas no requiere tocar la logica.
 *
 * Tipos:
 *  - "zona"     -> region del dolor (valores exactos del formulario de ICA)
 *  - "lado"     -> Derecha / Izquierda
 *  - "edad"     -> numero
 *  - "sexo"     -> Masculino / Femenino
 *  - "sino"     -> si / no (banderas rojas)
 *  - "abierta"  -> se guarda textual y va completa al backend
 *
 * Campos opcionales:
 *  - aplica(ctx): la pregunta solo se hace si devuelve true (ctx = respuestas hasta ahora)
 *  - bandera: "grave" (si responde SI -> se detiene y deriva) | "aviso" (continua con aviso)
 *  - resumen: como se escribe la respuesta en la consulta enviada al backend
 *  - opcional: en abiertas, si responde "no"/"nada" se omite
 */

export const ZONAS = [
  "Rodilla", "Cadera", "Hombro", "Codo", "Mano", "Tobillo",
  "Columna lumbar", "Columna cervical", "Columna dorsal",
];

export const esColumna = (zona) => String(zona || "").toLowerCase().startsWith("columna");
const esExtremidadInferior = (zona) => ["Rodilla", "Cadera", "Tobillo"].includes(zona);

export const SALUDO =
  "Hola, soy la asistente del Instituto de Cirugía Articular. Te voy a hacer algunas preguntas, " +
  "como en una consulta, para orientarte y, si lo necesitas, entregarte una orden de exámenes. " +
  "Responde hablando con naturalidad.";

export const PREGUNTAS = [
  // ---------------- Ubicacion y datos basicos ----------------
  {
    id: "zona",
    tipo: "zona",
    texto: "Para empezar, ¿en qué parte del cuerpo tienes el dolor?",
    repregunta: "Perdón, no te entendí. ¿Es la rodilla, la cadera, el hombro, el codo, la mano, el tobillo o la espalda?",
  },
  {
    id: "lado",
    tipo: "lado",
    texto: "¿Es el lado derecho o el izquierdo?",
    repregunta: "¿Me repites de qué lado? Si son los dos, dime cuál te duele más.",
    aplica: (ctx) => !esColumna(ctx.zona),
  },
  {
    id: "edad",
    tipo: "edad",
    texto: "¿Qué edad tienes?",
    repregunta: "¿Me repites tu edad en años?",
  },
  {
    id: "sexo",
    tipo: "sexo",
    texto: "¿Eres hombre o mujer?",
    repregunta: "Perdón, ¿eres hombre o mujer?",
  },

  // ---------------- Banderas rojas ----------------
  {
    id: "alarma_infeccion",
    tipo: "sino",
    bandera: "grave",
    texto: "¿Has tenido fiebre, o la zona está roja, caliente e hinchada?",
    repregunta: "Responde sí o no, por favor: ¿fiebre, o la zona roja, caliente e hinchada?",
    resumen: "fiebre o zona roja, caliente e hinchada",
  },
  {
    id: "alarma_neurologica",
    tipo: "sino",
    bandera: "grave",
    texto: "¿Has perdido fuerza en un brazo o pierna, o tienes adormecimiento que va avanzando?",
    textoSegun: (ctx) =>
      ctx.zona === "Columna lumbar"
        ? "¿Has perdido fuerza en una pierna, tienes adormecimiento que va avanzando, o dificultad para orinar o adormecimiento entre las piernas?"
        : null,
    repregunta: "Responde sí o no, por favor: ¿pérdida de fuerza o adormecimiento que va avanzando?",
    resumen: "pérdida de fuerza o adormecimiento progresivo",
  },
  {
    id: "alarma_trauma_vascular",
    tipo: "sino",
    bandera: "grave",
    texto: "¿Tuviste un golpe fuerte y ves una deformidad, o la mano o el pie están fríos, pálidos o morados?",
    textoSegun: (ctx) =>
      esExtremidadInferior(ctx.zona)
        ? "¿Tuviste un golpe fuerte y no puedes apoyar el pie o caminar, ves una deformidad, o el pie está frío, pálido o morado?"
        : null,
    repregunta: "Responde sí o no, por favor: ¿golpe con deformidad, o la mano o el pie fríos o morados?",
    resumen: "trauma con deformidad, imposibilidad de apoyo o compromiso vascular",
  },
  {
    id: "alarma_columna",
    tipo: "sino",
    bandera: "aviso",
    texto: "¿Te duele de noche aunque estés en reposo, has bajado de peso sin explicación, o has tenido cáncer?",
    repregunta: "Responde sí o no, por favor: ¿dolor nocturno en reposo, baja de peso o antecedente de cáncer?",
    aplica: (ctx) => esColumna(ctx.zona),
    resumen: "dolor nocturno en reposo, baja de peso o antecedente oncológico",
  },

  // ---------------- Anamnesis abierta ----------------
  {
    id: "caracteristicas",
    tipo: "abierta",
    texto: "Cuéntame cómo es tu dolor: dónde lo sientes exactamente, cómo es, y qué cosas lo empeoran.",
    resumen: "Características del dolor",
  },
  {
    id: "evolucion",
    tipo: "abierta",
    texto: "¿Desde cuándo te duele, y cómo empezó? Por ejemplo, con un golpe, una torcedura, un esfuerzo, o sin causa clara.",
    resumen: "Tiempo de evolución e inicio",
  },
  {
    id: "asociados",
    tipo: "abierta",
    texto: "¿Has notado hinchazón, que la articulación se trabe o falle, chasquidos, hormigueo o rigidez?",
    resumen: "Síntomas asociados",
  },
  {
    id: "tratamientos",
    tipo: "abierta",
    texto: "¿Qué has hecho hasta ahora? Por ejemplo remedios, kinesiología, infiltraciones o alguna cirugía.",
    resumen: "Tratamientos previos",
  },
  {
    id: "adicional",
    tipo: "abierta",
    opcional: true,
    texto: "Por último, ¿quieres agregar algo más que creas importante?",
    resumen: "Información adicional",
  },
];

export const FRASES = {
  puntos: "Ahora muéstrame en el dibujo dónde te duele. Marca los puntos y luego toca guardar.",
  analizando: "Gracias. Estoy revisando todo lo que me contaste, dame un momento.",
  urgencia:
    "Por lo que me cuentas, es importante que te evalúe un médico pronto. Te recomiendo acudir a un servicio de urgencia. " +
    "No es conveniente esperar una orden de exámenes en este caso.",
  avisoColumna:
    "Como me contaste que tienes dolor nocturno, baja de peso o antecedente de cáncer, te recomiendo que te evalúe un especialista pronto.",
  preguntarOrden: "¿Quieres que te entregue la orden de exámenes?",
  repreguntarOrden: "Responde sí o no, por favor: ¿quieres la orden de exámenes?",
  sinOrden: "Está bien. Si cambias de opinión, puedes volver a empezar cuando quieras. Cuídate.",
  pedirDatos: "Perfecto. Para emitir la orden, completa tus datos en la pantalla.",
  resonancia: "Como incluye una resonancia, antes de emitir la orden responde unas preguntas de seguridad en la pantalla.",
  ordenLista: "Listo. Tu orden de exámenes está lista para descargar.",
  ordenListaCorreo: "Listo. Tu orden está lista para descargar, y también te la enviamos por correo.",
  cierre: "Recuerda que esto es una orientación y no reemplaza la evaluación presencial con un especialista.",
  errorAnalisis: "Tuve un problema para revisar tu información. Intenta de nuevo en un momento.",
};
